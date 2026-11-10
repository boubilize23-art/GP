-- ═══════════════════════════════════════════════════════════════════════════
--  GESTIOPRO — Correctif 13 : la génération de clés est ILLIMITÉE, mais elle
--  RESPECTE les règles.
--
--  Ce qui change (mesuré le 2 novembre 2026) :
--   1. une société dont la licence est expirée (ou dont le compte est bloqué)
--      pouvait encore émettre une clé d'invitation  → désormais REFUSÉ ;
--   2. une clé d'invitation pouvait être émise pour 365 jours  → désormais
--      bornée à 30 jours ET jamais au-delà de la fin de licence ;
--   3. une clé d'invitation d'une société expirée pouvait être consommée
--      à l'inscription  → désormais REFUSÉE au moment de la consommation.
--
--  Le nombre de clés reste ILLIMITÉ : une clé par poste, plusieurs clés par
--  poste possibles, et chaque clé est réemployable.
--
--  (À exécuter APRÈS les scripts 11 et 12.)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────────
--  1. Émission d'une clé d'invitation : les règles sont vérifiées par la base
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.create_invitation_key(
  p_role_cible text,
  p_poste      text default null,
  p_manager_id uuid default null,
  p_label      text default null,
  p_days       integer default 30
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code      text;
  v_org       uuid := public.current_organization_id();
  v_role      text := lower(coalesce(p_role_cible, ''));
  v_days      integer := coalesce(p_days, 30);
  v_licence   timestamptz;
  v_remaining integer;
  v_active    boolean;
begin
  if not public.is_org_admin() then
    raise exception 'Seul un administrateur de societe peut emettre une cle d''invitation.';
  end if;
  if v_org is null then
    raise exception 'Vous n''avez pas de societe.';
  end if;
  if v_role not in ('manager', 'user') then
    raise exception 'Role invalide (manager ou user attendu).';
  end if;

  -- RÈGLE 1 — la société doit être active et la licence valide.
  -- org_write_allowed() vérifie d'un coup le compte actif ET la licence.
  if not public.org_write_allowed() then
    raise exception 'Licence expiree ou compte bloque : impossible d''emettre une cle d''invitation. Demandez d''abord une cle de renouvellement a l''administrateur principal.';
  end if;

  select o.active into v_active
    from public.organizations o
   where o.id = v_org;
  if v_active is false then
    raise exception 'Votre societe est inactive : impossible d''emettre une cle d''invitation.';
  end if;

  -- RÈGLE 2 — la durée est bornée : 30 jours maximum, et jamais au-delà de la
  -- fin de licence de la société (une clé ne peut pas survivre à sa licence).
  v_licence := (select o.licence_expires_at
                  from public.organizations o
                 where o.id = v_org);

  v_days := least(v_days, 30);

  if v_licence is not null then
    v_remaining := greatest(floor(extract(epoch from (v_licence - now())) / 86400)::int, 0);
    v_days := least(v_days, v_remaining);
    if v_days < 1 then
      raise exception 'Licence expiree : impossible d''emettre une cle d''invitation.';
    end if;
  end if;

  -- Le directeur de rattachement doit appartenir à la même société
  if p_manager_id is not null then
    if not exists (
      select 1 from public.profiles
       where id = p_manager_id and organization_id = v_org
    ) then
      raise exception 'Le directeur de rattachement n''appartient pas a votre societe.';
    end if;
  end if;

  v_code := public.generate_invitation_code();

  insert into public.invitation_keys
    (code, organization_id, role_cible, poste, manager_id, label, created_by, expires_at)
  values (
    v_code,
    v_org,
    v_role,
    nullif(trim(p_poste), ''),
    p_manager_id,
    nullif(trim(p_label), ''),
    auth.uid(),
    now() + make_interval(days => v_days)
  );

  return v_code;
end $$;

revoke all on function public.create_invitation_key(text, text, uuid, text, integer) from public;
grant execute on function public.create_invitation_key(text, text, uuid, text, integer) to authenticated;

-- ───────────────────────────────────────────────────────────────────────────────
--  2. Consommation d'une clé d'invitation : la licence de la société invitée
--     doit être valide (contrôle fait dans la même requête = pas de course)
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.consume_invitation_key(
  p_code    text,
  p_email   text default null,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_role text;
  v_org  uuid;
  v_poste text;
  v_mgr  uuid;
begin
  if length(v_code) < 4 then
    return null;
  end if;

  update public.invitation_keys k
     set uses_count      = k.uses_count + 1,
         last_used_at    = now(),
         last_used_email = nullif(lower(coalesce(p_email, '')), '')
   where k.id = (
           select k2.id
             from public.invitation_keys k2
             join public.organizations o on o.id = k2.organization_id
            where upper(regexp_replace(k2.code, '[^A-Za-z0-9]', '', 'g')) = v_code
              and k2.revoked_at is null
              and (k2.expires_at is null or k2.expires_at > now())
              and (o.licence_expires_at is null or o.licence_expires_at > now())
            limit 1
          )
  returning k.role_cible, k.organization_id, k.poste, k.manager_id
    into v_role, v_org, v_poste, v_mgr;

  if v_role is null then
    return null;
  end if;

  return jsonb_build_object(
    'role', v_role, 'organization_id', v_org, 'poste', v_poste, 'manager_id', v_mgr);
end $$;

revoke all on function public.consume_invitation_key(text, text, uuid) from public;

-- ───────────────────────────────────────────────────────────────────────────────
--  3. Vérification : message clair quand la licence de la société invitée est
--     expirée (l'écran d'inscription le montre avant même la saisie)
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.check_signup_key(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_role text;
  v_org  uuid;
  v_exp  timestamptz;
  v_used timestamptz;
  v_revoked timestamptz;
  v_days integer;
  v_poste text;
  v_mgr  uuid;
  v_name text;
  v_org_licence timestamptz;
begin
  if length(v_code) < 4 then
    return jsonb_build_object('ok', false, 'reason', 'invalide');
  end if;

  -- 1. Clé d'inscription administrateur (émise par l'administrateur principal)
  select k.licence_days, k.used_at, k.revoked_at, k.expires_at
    into v_days, v_used, v_revoked, v_exp
    from public.admin_signup_keys k
   where upper(regexp_replace(k.code, '[^A-Za-z0-9]', '', 'g')) = v_code;

  if v_days is not null then
    if v_used is not null or v_revoked is not null then
      return jsonb_build_object('ok', false, 'reason', 'utilisee', 'type', 'admin_societe');
    end if;
    if v_exp is not null and v_exp <= now() then
      return jsonb_build_object('ok', false, 'reason', 'expiree', 'type', 'admin_societe');
    end if;
    return jsonb_build_object(
      'ok', true, 'type', 'admin_societe', 'role', 'admin',
      'days', v_days, 'expires_at', v_exp);
  end if;

  -- 2. Clé d'invitation (émise par un administrateur de société)
  select k.role_cible, k.organization_id, k.expires_at, k.poste, k.manager_id, o.name,
         k.revoked_at, o.licence_expires_at
    into v_role, v_org, v_exp, v_poste, v_mgr, v_name, v_revoked, v_org_licence
    from public.invitation_keys k
    join public.organizations o on o.id = k.organization_id
   where upper(regexp_replace(k.code, '[^A-Za-z0-9]', '', 'g')) = v_code;

  if v_role is null then
    return jsonb_build_object('ok', false, 'reason', 'invalide');
  end if;

  if v_revoked is not null then
    return jsonb_build_object('ok', false, 'reason', 'revoquee', 'type', 'invitation');
  end if;

  if v_exp is not null and v_exp <= now() then
    return jsonb_build_object('ok', false, 'reason', 'expiree', 'type', 'invitation');
  end if;

  -- La société invitée doit avoir une licence valide
  if v_org_licence is not null and v_org_licence <= now() then
    return jsonb_build_object('ok', false, 'reason', 'licence_expiree', 'type', 'invitation');
  end if;

  return jsonb_build_object(
    'ok', true, 'type', 'invitation', 'role', v_role,
    'organization', v_name, 'poste', v_poste, 'expires_at', v_exp);
end $$;

revoke all on function public.check_signup_key(text) from public;
grant execute on function public.check_signup_key(text) to anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────────
--  4. Vérification finale
-- ───────────────────────────────────────────────────────────────────────────────
select proname,
       pg_get_function_arguments(oid) as arguments
  from pg_proc
 where proname in ('create_invitation_key', 'consume_invitation_key', 'check_signup_key')
 order by proname;
