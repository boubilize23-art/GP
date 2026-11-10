-- ═══════════════════════════════════════════════════════════════════════════════
--  GESTIOPRO — Licence 30 jours, clés d'invitation par poste, blocage
--  (1er novembre 2026)
-- ═══════════════════════════════════════════════════════════════════════════════
--
--  LE MODÈLE VALIDÉ PAR LE PROPRIÉTAIRE DE LA PLATEFORME
--
--  1. L'ADMINISTRATEUR PRINCIPAL (is_super_admin) est le SEUL à pouvoir
--     autoriser une nouvelle société. Il émet une clé d'inscription
--     administrateur à usage unique ; elle ouvre une licence de 30 JOURS.
--
--  2. L'ADMINISTRATEUR DE SOCIÉTÉ reçoit cette clé, s'inscrit (sa société est
--     créée) et dispose de 30 jours pour travailler.
--
--  3. RENOUVELLEMENT : l'administrateur principal émet une nouvelle clé ;
--     l'administrateur de société la saisit dans l'application. Les 30 jours
--     repartent et LES DONNÉES SONT CONSERVÉES telles quelles.
--
--  4. EXPIRATION SANS RENOUVELLEMENT : à la date de fin, les écritures de la
--     société sont BLOQUÉES PAR LA BASE (RLS). LES DONNÉES NE SONT JAMAIS
--     SUPPRIMÉES. Seul l'administrateur principal peut supprimer définitivement
--     un compte ou une société, sur action explicite de sa part.
--
--  5. L'ADMINISTRATEUR DE SOCIÉTÉ émet autant de CLÉS D'INVITATION qu'il veut,
--     une par poste, pour ses directeurs et utilisateurs. Chaque clé est
--     réemployable, valable 30 jours, désigne le poste et le rôle visé
--     (directeur ou utilisateur) et rattache l'utilisateur au directeur du poste.
--
--  Règle fondatrice : c'est la BASE qui applique les règles (RLS + déclencheurs),
--  pas l'interface.
--
--  À exécuter UNE SEULE FOIS dans le SQL Editor de Supabase :
--    https://supabase.com/dashboard/project/bdoodzgwriyqsejspajf/sql/new
-- ═══════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────────
--  1. Licence de la société
-- ───────────────────────────────────────────────────────────────────────────────
alter table public.organizations
  add column if not exists licence_expires_at timestamptz;

comment on column public.organizations.licence_expires_at is
  'Fin de la licence de la societe (30 jours par defaut). NULL = illimitee. Expiree = ecritures bloquees, donnees conservees.';

-- Les sociétés déjà en place (dont celle de l'administrateur principal) sont
-- en licence illimitée : on ne casse rien au passage.
update public.organizations
   set licence_expires_at = null
 where licence_expires_at is null;

-- ───────────────────────────────────────────────────────────────────────────────
--  2. Clés d'invitation : administrateur de société → directeurs et utilisateurs
-- ───────────────────────────────────────────────────────────────────────────────
create table if not exists public.invitation_keys (
  id              uuid primary key default gen_random_uuid(),
  code            text        not null unique,
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  role_cible      text        not null check (role_cible in ('manager', 'user')),
  poste           text,                       -- poste concerné (ex: "Boutique Dakar")
  manager_id      uuid references auth.users(id) on delete set null, -- directeur de rattachement
  label           text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz,
  revoked_at      timestamptz,
  uses_count      integer     not null default 0,
  last_used_at    timestamptz,
  last_used_email text
);

create index if not exists idx_invitation_keys_org on public.invitation_keys (organization_id);
create index if not exists idx_invitation_keys_code on public.invitation_keys (upper(code));

comment on table public.invitation_keys is
  'Cles d invitation emises par l administrateur de societe : une par poste, pour ses directeurs et utilisateurs.';

alter table public.invitation_keys enable row level security;
revoke all on table public.invitation_keys from anon, authenticated;

-- Durée de licence accordée par une clé d'inscription administrateur
alter table public.admin_signup_keys
  add column if not exists licence_days integer not null default 30;

-- ───────────────────────────────────────────────────────────────────────────────
--  3. Fonctions de contrôle : licence et compte actif
-- ───────────────────────────────────────────────────────────────────────────────

-- Date de fin de licence de la société de l'utilisateur connecté (NULL = illimitée)
create or replace function public.current_licence_expires_at()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select o.licence_expires_at
    from public.profiles p
    join public.organizations o on o.id = p.organization_id
   where p.id = auth.uid()
$$;

-- La société de l'utilisateur a-t-elle encore une licence valide ?
create or replace function public.org_licence_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select o.licence_expires_at is null or o.licence_expires_at > now()
       from public.profiles p
       join public.organizations o on o.id = p.organization_id
      where p.id = auth.uid()),
    false)
$$;

-- L'utilisateur peut-il écrire ? (compte actif ET licence valide)
create or replace function public.org_write_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_active
        and (o.licence_expires_at is null or o.licence_expires_at > now())
       from public.profiles p
       join public.organizations o on o.id = p.organization_id
      where p.id = auth.uid()),
    false)
$$;

-- ───────────────────────────────────────────────────────────────────────────────
--  4. Génération d'une clé d'invitation (administrateur de société)
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.generate_invitation_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_code       text;
  v_tentatives integer := 0;
begin
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

    exit when not exists (
      select 1 from public.invitation_keys where upper(code) = v_code
    ) and not exists (
      select 1 from public.admin_signup_keys where upper(code) = v_code
    );

    v_tentatives := v_tentatives + 1;
    if v_tentatives > 20 then
      raise exception 'Impossible de generer une cle unique. Reessayez.';
    end if;
  end loop;

  return v_code;
end $$;

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
  v_code   text;
  v_org    uuid := public.current_organization_id();
  v_role   text := lower(coalesce(p_role_cible, ''));
  v_days   integer := coalesce(p_days, 30);
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
  if v_days < 1 or v_days > 365 then
    raise exception 'Duree invalide (entre 1 et 365 jours).';
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
--  5. Liste et révocation des clés d'invitation
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.list_invitation_keys()
returns table (
  id               uuid,
  code             text,
  role_cible       text,
  poste            text,
  manager_id       uuid,
  manager_name     text,
  organization_id  uuid,
  organization_name text,
  label            text,
  created_at       timestamptz,
  expires_at       timestamptz,
  revoked_at       timestamptz,
  uses_count       integer,
  last_used_at     timestamptz,
  last_used_email  text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_org_admin() or public.is_super_admin()) then
    return;
  end if;

  return query
    select k.id, k.code, k.role_cible, k.poste, k.manager_id,
           coalesce(pm.full_name, '') as manager_name,
           k.organization_id, o.name, k.label, k.created_at, k.expires_at,
           k.revoked_at, k.uses_count, k.last_used_at, k.last_used_email
      from public.invitation_keys k
      join public.organizations o on o.id = k.organization_id
      left join public.profiles pm on pm.id = k.manager_id
     where public.is_super_admin()
        or k.organization_id = public.current_organization_id()
     order by k.created_at desc;
end $$;

revoke all on function public.list_invitation_keys() from public;
grant execute on function public.list_invitation_keys() to authenticated;

create or replace function public.revoke_invitation_key(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_ok   boolean := false;
begin
  update public.invitation_keys k
     set revoked_at = now()
   where upper(regexp_replace(k.code, '[^A-Za-z0-9]', '', 'g')) = v_code
     and k.revoked_at is null
     and (public.is_super_admin()
          or (public.is_org_admin() and k.organization_id = public.current_organization_id()));

  v_ok := found;
  return v_ok;
end $$;

revoke all on function public.revoke_invitation_key(text) from public;
grant execute on function public.revoke_invitation_key(text) to authenticated;

-- ───────────────────────────────────────────────────────────────────────────────
--  6. Vérification d'une clé AVANT l'inscription (accessible à l'anonyme)
--     Gère les deux types de clés et indique le rôle attribué.
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
         k.revoked_at
    into v_role, v_org, v_exp, v_poste, v_mgr, v_name, v_revoked
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
  if not exists (
    select 1 from public.organizations o
     where o.id = v_org
       and (o.licence_expires_at is null or o.licence_expires_at > now())
  ) then
    return jsonb_build_object('ok', false, 'reason', 'licence_expiree', 'type', 'invitation');
  end if;

  return jsonb_build_object(
    'ok', true, 'type', 'invitation', 'role', v_role,
    'organization', v_name, 'poste', v_poste, 'expires_at', v_exp);
end $$;

revoke all on function public.check_signup_key(text) from public;
grant execute on function public.check_signup_key(text) to anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────────
--  7. Consommation d'une clé d'invitation (interne, déclencheur d'inscription)
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
            where upper(regexp_replace(k2.code, '[^A-Za-z0-9]', '', 'g')) = v_code
              and k2.revoked_at is null
              and (k2.expires_at is null or k2.expires_at > now())
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
--  8. Renouvellement de la licence : l'administrateur de société saisit la
--     nouvelle clé délivrée par l'administrateur principal. Les 30 jours
--     repartent, LES DONNÉES SONT CONSERVÉES.
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.renew_licence(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_code  text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_org   uuid := public.current_organization_id();
  v_days  integer;
  v_id    uuid;
  v_exp   timestamptz;
begin
  if v_org is null then
    raise exception 'Vous n''avez pas de societe.';
  end if;
  if not (public.is_org_admin() or public.is_super_admin()) then
    raise exception 'Seul un administrateur peut renouveler la licence.';
  end if;
  if length(v_code) < 4 then
    raise exception 'Cle invalide.';
  end if;

  -- Consommation atomique : la clé ne peut servir qu'une fois
  update public.admin_signup_keys k
     set used_at    = now(),
         used_by    = auth.uid(),
         used_email = (select p.email from public.profiles p where p.id = auth.uid())
   where k.id = (
           select k2.id
             from public.admin_signup_keys k2
            where upper(regexp_replace(k2.code, '[^A-Za-z0-9]', '', 'g')) = v_code
              and k2.revoked_at is null
              and k2.used_at is null
              and (k2.expires_at is null or k2.expires_at > now())
            limit 1
          )
  returning k.licence_days, k.id into v_days, v_id;

  if v_id is null then
    raise exception 'Cle invalide ou deja utilisee.';
  end if;

  v_exp := now() + make_interval(days => v_days);

  -- La plateforme (administrateur principal) est en licence illimitée :
  -- renouveler ne doit jamais bloquer sa propre société.
  if exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.is_super_admin
  ) then
    update public.organizations
       set licence_expires_at = null
     where id = v_org;
  else
    update public.organizations
       set licence_expires_at = v_exp
     where id = v_org;
  end if;

  return jsonb_build_object(
    'ok', true, 'expires_at', v_exp, 'days', v_days,
    'message', 'Licence renouvelee. Vos donnees sont conservees.');
end $$;

revoke all on function public.renew_licence(text) from public;
grant execute on function public.renew_licence(text) to authenticated;

-- ───────────────────────────────────────────────────────────────────────────────
--  9. Bloquer / débloquer toute une société (administrateur principal)
--     Le blocage passe par profiles.is_active : il est appliqué par la base
--     (org_write_allowed) et par l'interface.
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.set_organization_blocked(p_org_id uuid, p_blocked boolean)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_super_admin() then
    raise exception 'Seul l''administrateur principal peut bloquer une societe.';
  end if;
  if p_org_id is null then
    raise exception 'Societe inconnue.';
  end if;

  update public.profiles
     set is_active = not coalesce(p_blocked, false)
   where organization_id = p_org_id;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function public.set_organization_blocked(uuid, boolean) from public;
grant execute on function public.set_organization_blocked(uuid, boolean) to authenticated;

-- ───────────────────────────────────────────────────────────────────────────────
--  10. Règles RLS : les écritures sont bloquées si le compte est bloqué ou si
--      la licence de la société est expirée. LES DONNÉES RESTENT INTACTES.
-- ───────────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'products', 'clients', 'suppliers', 'sales',
    'purchases', 'receivables', 'stock_movements', 'purchase_requests'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_org_insert', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.org_write_allowed()))',
      t || '_org_insert', t);

    execute format('drop policy if exists %I on public.%I', t || '_org_update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.org_write_allowed())) with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.org_write_allowed()))',
      t || '_org_update', t);

    execute format('drop policy if exists %I on public.%I', t || '_org_delete', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.org_write_allowed()))',
      t || '_org_delete', t);
  end loop;
end $$;

-- L'écriture sur la société elle-même (nom, description) suit la même règle.
-- On conserve la branche « administrateur principal » : lui n'est jamais
-- bloqué par la licence d'une société cliente.
drop policy if exists org_admin_all on public.organizations;
create policy org_admin_all on public.organizations for all to authenticated
  using (
    public.is_super_admin()
    or (public.is_org_admin() and id = public.current_organization_id())
  )
  with check (
    public.is_super_admin()
    or (public.is_org_admin() and id = public.current_organization_id()
        and public.org_write_allowed())
  );

-- ───────────────────────────────────────────────────────────────────────────────
--  11. Déclencheur d'inscription
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role       text;
  v_username   text;
  v_fullname   text;
  v_first      boolean;
  v_code       text;      -- clé d'organisation partagée (ancienne mécanique)
  v_adminkey   text;      -- clé d'inscription administrateur (usage unique)
  v_inv        jsonb;     -- clé d'invitation (réemployable)
  v_org_id     uuid;
  v_manager    uuid;
  v_supervisor uuid;
  v_days       integer;
begin
  v_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    '[^a-zA-Z0-9_.-]', '', 'g'));

  if length(v_username) < 3 then
    v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  v_fullname := coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), v_username);
  v_role     := coalesce(new.raw_user_meta_data ->> 'role', 'user');
  v_code     := upper(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'organization_key', ''), '[^A-Za-z0-9]', '', 'g'));
  v_adminkey := upper(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'admin_key', ''), '[^A-Za-z0-9]', '', 'g'));

  -- Le tout premier compte de l'application est administrateur (amorçage).
  select not exists (select 1 from public.profiles) into v_first;
  if v_first then
    v_role := 'admin';
  end if;

  -- ═══ ADMINISTRATEUR DE SOCIÉTÉ ═══════════════════════════════════════════
  if v_role = 'admin' then
    if not v_first then
      if length(v_adminkey) < 4 then
        raise exception 'Cle d''inscription administrateur requise : demandez une cle a usage unique a l''administrateur principal de la plateforme.';
      end if;

      select k.licence_days into v_days
        from public.admin_signup_keys k
       where upper(regexp_replace(k.code, '[^A-Za-z0-9]', '', 'g')) = v_adminkey
         and k.revoked_at is null
         and k.used_at is null
         and (k.expires_at is null or k.expires_at > now());

      if v_days is null then
        raise exception 'Cle d''inscription administrateur invalide ou deja utilisee.';
      end if;

      if not public.consume_admin_signup_key(v_adminkey, new.email, new.id) then
        raise exception 'Cle d''inscription administrateur invalide ou deja utilisee.';
      end if;
    end if;

    insert into public.profiles (id, email, username, full_name, company, role, avatar)
    values (
      new.id, new.email, v_username, v_fullname,
      coalesce(new.raw_user_meta_data ->> 'company', ''), 'admin',
      upper(left(v_fullname, 2))
    )
    on conflict (id) do nothing;

    -- Création de SA société, de sa clé d'organisation et de sa licence
    -- (le tout premier compte d'amorçage reste en licence illimitée)
    insert into public.organizations (name, join_code, join_code_rotated_at, licence_expires_at)
    values (
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'company'), ''), 'Mon organisation'),
      public.generate_join_code(),
      now(),
      case when v_first then null
           else now() + make_interval(days => coalesce(v_days, 30))
      end
    )
    returning id into v_org_id;

    update public.profiles
       set organization_id = v_org_id
     where id = new.id;

    return new;
  end if;

  -- ═══ DIRECTEUR / UTILISATEUR ══════════════════════════════════════════════
  -- Rattachement par clé d'invitation (prioritaire), sinon par clé d'organisation.
  if length(v_code) >= 4 then
    v_inv := public.consume_invitation_key(v_code, new.email, new.id);

    if v_inv is not null then
      v_org_id  := (v_inv ->> 'organization_id')::uuid;
      v_manager := (v_inv ->> 'manager_id')::uuid;

      -- Le rôle vient de la clé (elle désigne le poste)
      v_role := v_inv ->> 'role';

      -- Licence de la société invitée : si elle est expirée, on refuse
      if not exists (
        select 1 from public.organizations o
         where o.id = v_org_id
           and (o.licence_expires_at is null or o.licence_expires_at > now())
      ) then
        raise exception 'La licence de cette societe est expiree : contactez votre administrateur principal.';
      end if;
    end if;
  end if;

  if v_org_id is null and length(v_code) >= 4 then
    select o.id into v_org_id
      from public.organizations o
     where upper(regexp_replace(o.join_code, '[^A-Za-z0-9]', '', 'g')) = v_code
       and o.active = true
     limit 1;
  end if;

  insert into public.profiles (id, email, username, full_name, company, role, avatar)
  values (
    new.id, new.email, v_username, v_fullname,
    coalesce(new.raw_user_meta_data ->> 'company', ''), v_role,
    upper(left(v_fullname, 2))
  )
  on conflict (id) do nothing;

  if v_org_id is not null then
    -- Rattachement hiérarchique
    if v_manager is not null then
      v_supervisor := v_manager;
    elsif v_role = 'manager' then
      select p.id into v_supervisor from public.profiles p
       where p.organization_id = v_org_id and p.role = 'admin' and p.is_active = true
       limit 1;
    else
      select p.id into v_supervisor from public.profiles p
       where p.organization_id = v_org_id and p.role = 'manager' and p.is_active = true
       limit 1;
      if v_supervisor is null then
        select p.id into v_supervisor from public.profiles p
         where p.organization_id = v_org_id and p.role = 'admin' and p.is_active = true
         limit 1;
      end if;
    end if;

    update public.profiles
       set organization_id = v_org_id,
           managed_by = v_supervisor
     where id = new.id;
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────────────────────────────────────────────────────────
--  12. Émission d'une clé d'inscription administrateur : la durée de licence
--      est désormais paramétrable (30 jours par défaut).
-- ───────────────────────────────────────────────────────────────────────────────
-- On supprime l'ancienne version à 2 arguments : sinon PostgreSQL créerait
-- une SURCHARGE au lieu de remplacer la fonction, et l'appel à 2 arguments
-- continuerait d'utiliser l'ancienne version (sans durée de licence).
drop function if exists public.create_admin_signup_key(text, integer);

create or replace function public.create_admin_signup_key(
  p_label        text default null,
  p_expires_days integer default null,
  p_licence_days integer default 30
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_days integer := coalesce(p_licence_days, 30);
begin
  if not public.is_super_admin() then
    raise exception 'Seul l''administrateur principal peut emettre une cle d''inscription administrateur.';
  end if;
  if v_days < 1 or v_days > 365 then
    raise exception 'Duree de licence invalide (entre 1 et 365 jours).';
  end if;

  v_code := public.generate_admin_signup_code();

  insert into public.admin_signup_keys
    (code, label, created_by, expires_at, licence_days)
  values (
    v_code,
    nullif(trim(p_label), ''),
    auth.uid(),
    case when p_expires_days is null or p_expires_days <= 0
         then null
         else now() + make_interval(days => p_expires_days)
    end,
    v_days
  );

  return v_code;
end $$;

revoke all on function public.create_admin_signup_key(text, integer, integer) from public;
grant execute on function public.create_admin_signup_key(text, integer, integer) to authenticated;

-- ───────────────────────────────────────────────────────────────────────────────
--  Vérification
-- ───────────────────────────────────────────────────────────────────────────────
select name, licence_expires_at, join_code from public.organizations order by name;

select proname, prorettype::regtype
  from pg_proc
 where proname in ('create_invitation_key', 'list_invitation_keys', 'revoke_invitation_key',
                    'check_signup_key', 'consume_invitation_key', 'renew_licence',
                    'set_organization_blocked', 'org_write_allowed', 'org_licence_active',
                    'current_licence_expires_at', 'handle_new_user')
 order by proname;
