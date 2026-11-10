-- ═══════════════════════════════════════════════════════════════════════════
--  GESTIOPRO — Correctif 14 : une inscription est TOUJOURS refusée quand la
--  clé présentée est bloquée, et un compte orphelin ne peut plus être créé.
--
--  Ce qui change (mesuré le 2 novembre 2026, après le correctif 13) :
--   le correctif 13 a déplacé le contrôle de licence dans
--   consume_invitation_key(). Bien sûr, la règle de sécurité tient (le compte
--   n'est rattaché à aucune société expirée), MAIS le déclencheur ne voyait
--   plus l'échec : il poursuivait et créait un profil SANS société
--   (organization_id = null) — l'inscription répondait 200 « succès » alors
--   que la règle exigeait un REFUS.
--
--  Ce correctif rétablit le refus explicite :
--   1. clé d'invitation connue mais bloquée (licence expirée, clé révoquée,
--      clé expirée)  → inscription REFUSÉE avec un message clair ;
--   2. aucune clé exploitable  → inscription REFUSÉE (plus de compte orphelin).
--
--  (À exécuter APRÈS les scripts 11, 12 et 13.)
-- ═══════════════════════════════════════════════════════════════════════════

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
  v_code       text;      -- clé d'invitation ou clé d'organisation (ancienne mécanique)
  v_adminkey   text;      -- clé d'inscription administrateur (usage unique)
  v_inv        jsonb;     -- clé d'invitation (réemployable)
  v_org_id     uuid;
  v_manager    uuid;
  v_supervisor uuid;
  v_days       integer;
  v_key_exists  boolean := false;  -- la clé existe bien (mais ne peut pas servir)
  v_key_revoked boolean := false;  -- clé révoquée
  v_key_expired boolean := false;  -- clé elle-même expirée
  v_org_expired boolean := false;  -- licence de la société invitée expirée
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

    if v_inv is null then
      -- La clé n'a pas pu être consommée. On cherche à dire POURQUOI, pour
      -- ne jamais transformer un refus en compte orphelin (organization_id
      -- vide) et pour ne jamais laisser passer une clé bloquée.
      select true,
             coalesce(k.revoked_at is not null, false),
             coalesce(k.expires_at is not null and k.expires_at <= now(), false),
             coalesce(o.licence_expires_at is not null and o.licence_expires_at <= now(), false)
        into v_key_exists, v_key_revoked, v_key_expired, v_org_expired
        from public.invitation_keys k
        join public.organizations o on o.id = k.organization_id
       where upper(regexp_replace(k.code, '[^A-Za-z0-9]', '', 'g')) = v_code
       limit 1;

      if v_key_exists is true and v_org_expired is true then
        raise exception 'La licence de cette societe est expiree : contactez votre administrateur principal.';
      elsif v_key_exists is true and v_key_revoked is true then
        raise exception 'Cette cle d''invitation a ete revoquee.';
      elsif v_key_exists is true and v_key_expired is true then
        raise exception 'Cette cle d''invitation a expire.';
      end if;
    else
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

  -- Aucune clé exploitable : on refuse la création du compte plutôt que de
  -- laisser un profil orphelin (sans société, sans rôle, sans encadrement).
  if v_org_id is null then
    raise exception 'Cle d''acces invalide ou inconnue : une cle d''invitation en cours de validite est requise pour creer un compte.';
  end if;

  insert into public.profiles (id, email, username, full_name, company, role, avatar)
  values (
    new.id, new.email, v_username, v_fullname,
    coalesce(new.raw_user_meta_data ->> 'company', ''), v_role,
    upper(left(v_fullname, 2))
  )
  on conflict (id) do nothing;

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

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────────────────────────────────────────────────────────
--  Vérification
-- ───────────────────────────────────────────────────────────────────────────────
select proname,
       pg_get_function_arguments(oid) as arguments
  from pg_proc
 where proname = 'handle_new_user';
