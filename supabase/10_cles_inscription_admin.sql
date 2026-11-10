-- ═══════════════════════════════════════════════════════════════════════════════
--  GESTIOPRO — Clé d'inscription administrateur à usage unique (30 octobre 2026)
-- ═══════════════════════════════════════════════════════════════════════════════
--
--  LE PROBLÈME
--    L'inscription d'un « Administrateur » était bloquée : l'application exigeait
--    une clé d'organisation d'au moins 8 caractères, alors que le formulaire n'en
--    demandait aucune et annonçait que le serveur en générait une.
--    Pire : n'importe qui pouvait s'inscrire comme administrateur et créer une
--    société sans autorisation (le déclencheur ne demandait aucune preuve).
--
--  LE MODÈLE VALIDÉ PAR LE PROPRIÉTAIRE DE LA PLATEFORME
--
--    1. L'ADMINISTRATEUR PRINCIPAL (is_super_admin = true) est le SEUL à
--       pouvoir autoriser la création d'une nouvelle société. Il émet une
--       « clé d'inscription administrateur » À USAGE UNIQUE et la transmet à la
--       personne concernée.
--
--    2. L'ADMINISTRATEUR qui reçoit cette clé s'inscrit avec elle :
--         • le serveur consomme la clé (elle ne fonctionnera PLUS jamais) ;
--         • le serveur crée SA société ;
--         • il devient administrateur de cette société.
--
--    3. Pour ses équipes, l'administrateur utilise la clé d'ORGANISATION de sa
--       société : UNE SEULE clé partagée, renouvelée tous les 30 jours (la
--       rotation est désormais contrôlée par la base, plus seulement par le
--       texte de l'interface).
--
--  Le contrôle est fait par la BASE (usage unique garanti atomiquement),
--  l'interface ne fait que la commodité de pré-validation.
--
--  À exécuter UNE SEULE FOIS dans le SQL Editor de Supabase :
--    https://supabase.com/dashboard/project/bdoodzgwriyqsejspajf/sql/new
-- ═══════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────────
--  1. Table des clés d'inscription administrateur
-- ───────────────────────────────────────────────────────────────────────────────
create table if not exists public.admin_signup_keys (
  id              uuid primary key default gen_random_uuid(),
  code            text        not null unique,
  label           text,                       -- pour qui ? (ex: "Société Diallo")
  created_by      uuid        references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz,
  used_at         timestamptz,
  used_by         uuid        references auth.users(id) on delete set null,
  used_email      text,
  revoked_at      timestamptz
);

create index if not exists idx_admin_signup_keys_code on public.admin_signup_keys (upper(code));

comment on table public.admin_signup_keys is
  'Cles d inscription administrateur a usage unique : autorisent la creation d une nouvelle societe.';

-- Aucun accès direct : tout passe par les fonctions ci-dessous (règles côté base).
alter table public.admin_signup_keys enable row level security;
revoke all on table public.admin_signup_keys from anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────────
--  2. Générateur de code aléatoire (12 caractères, format XXXX-XXXX-XXXX)
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.generate_admin_signup_code()
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
      select 1 from public.admin_signup_keys
       where upper(code) = v_code
    );

    v_tentatives := v_tentatives + 1;
    if v_tentatives > 20 then
      raise exception 'Impossible de generer une cle unique. Reessayez.';
    end if;
  end loop;

  return v_code;
end $$;

-- ───────────────────────────────────────────────────────────────────────────────
--  3. Émission d'une clé — administrateur principal uniquement
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.create_admin_signup_key(
  p_label        text default null,
  p_expires_days integer default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if not public.is_super_admin() then
    raise exception 'Seul l''administrateur principal peut emettre une cle d''inscription administrateur.';
  end if;

  v_code := public.generate_admin_signup_code();

  insert into public.admin_signup_keys
    (code, label, created_by, expires_at)
  values (
    v_code,
    nullif(trim(p_label), ''),
    auth.uid(),
    case when p_expires_days is null or p_expires_days <= 0
         then null
         else now() + make_interval(days => p_expires_days)
    end
  );

  return v_code;
end $$;

revoke all on function public.create_admin_signup_key(text, integer) from public;
grant execute on function public.create_admin_signup_key(text, integer) to authenticated;

-- ───────────────────────────────────────────────────────────────────────────────
--  4. Liste des clés — administrateur principal uniquement
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.list_admin_signup_keys()
returns table (
  id          uuid,
  code        text,
  label       text,
  created_at  timestamptz,
  expires_at  timestamptz,
  used_at     timestamptz,
  used_email  text,
  revoked_at  timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    return;
  end if;

  return query
    select k.id, k.code, k.label, k.created_at, k.expires_at,
           k.used_at, k.used_email, k.revoked_at
      from public.admin_signup_keys k
     order by k.created_at desc;
end $$;

revoke all on function public.list_admin_signup_keys() from public;
grant execute on function public.list_admin_signup_keys() to authenticated;

-- ───────────────────────────────────────────────────────────────────────────────
--  5. Pré-validation d'une clé (sans la consommer) — utilisé par le formulaire
--     d'inscription pour afficher une erreur claire AVANT de créer le compte.
--     Retourne true si la clé est valable, false sinon.
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.check_admin_signup_key(p_code text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_ok   boolean := false;
begin
  if length(v_code) < 4 then
    return false;
  end if;

  select exists (
    select 1
      from public.admin_signup_keys k
     where upper(regexp_replace(k.code, '[^A-Za-z0-9]', '', 'g')) = v_code
       and k.revoked_at is null
       and k.used_at is null
       and (k.expires_at is null or k.expires_at > now())
  ) into v_ok;

  return v_ok;
end $$;

revoke all on function public.check_admin_signup_key(text) from public;
grant execute on function public.check_admin_signup_key(text) to anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────────
--  6. Consommation d'une clé (USAGE UNIQUE, atomique)
--     Réservée au déclencheur d'inscription : l'identifiant du nouvel
--     utilisateur est passé en paramètre (auth.uid() n'est pas fiable dans un
--     déclencheur sur auth.users).
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.consume_admin_signup_key(
  p_code    text,
  p_email   text default null,
  p_user_id uuid default null
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_ok   boolean := false;
begin
  if length(v_code) < 4 then
    return false;
  end if;

  -- La mise à jour est atomique : si deux inscriptions utilisent la même clé
  -- en même temps, une seule aboutit (l'autre ne trouve plus la ligne).
  update public.admin_signup_keys k
     set used_at    = now(),
         used_by    = p_user_id,
         used_email = nullif(lower(coalesce(p_email, '')), '')
   where k.id = (
           select k2.id
             from public.admin_signup_keys k2
            where upper(regexp_replace(k2.code, '[^A-Za-z0-9]', '', 'g')) = v_code
              and k2.revoked_at is null
              and k2.used_at is null
              and (k2.expires_at is null or k2.expires_at > now())
            limit 1
          );

  v_ok := found;
  return v_ok;
end $$;

revoke all on function public.consume_admin_signup_key(text, text, uuid) from public;

-- ───────────────────────────────────────────────────────────────────────────────
--  7. Révocation d'une clé (avant usage)
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.revoke_admin_signup_key(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_ok   boolean := false;
begin
  if not public.is_super_admin() then
    raise exception 'Seul l''administrateur principal peut revoquer une cle.';
  end if;

  update public.admin_signup_keys k
     set revoked_at = now()
   where upper(regexp_replace(k.code, '[^A-Za-z0-9]', '', 'g')) = v_code
     and k.used_at is null
     and k.revoked_at is null;

  v_ok := found;
  return v_ok;
end $$;

revoke all on function public.revoke_admin_signup_key(text) from public;
grant execute on function public.revoke_admin_signup_key(text) to authenticated;

-- ───────────────────────────────────────────────────────────────────────────────
--  8. Rotation de la clé d'organisation : la règle des 30 JOURS passe enfin
--     dans la base (elle n'existait que dans le texte de l'interface).
--     Une nouvelle colonne est ajoutée pour dater la dernière rotation.
-- ───────────────────────────────────────────────────────────────────────────────
alter table public.organizations
  add column if not exists join_code_rotated_at timestamptz;

-- Initialisation : la dernière rotation connue est celle de last_changed_at.
update public.organizations
   set join_code_rotated_at = coalesce(join_code_rotated_at, last_changed_at)
 where join_code_rotated_at is null;

create or replace function public.rotate_join_code(p_code text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code   text;
  v_org_id uuid := public.current_organization_id();
  v_last   timestamptz;
begin
  if v_org_id is null then
    raise exception 'Vous n''avez pas d''organisation.';
  end if;
  if not public.is_org_admin() then
    raise exception 'Seul un administrateur peut modifier la cle.';
  end if;

  select join_code_rotated_at into v_last
    from public.organizations where id = v_org_id;

  -- Une seule rotation tous les 30 jours : c'est la règle annoncée dans
  -- l'interface, elle est désormais appliquée par le serveur.
  if v_last is not null and now() < v_last + interval '30 days' then
    raise exception 'Une nouvelle cle ne peut pas etre generee avant le %.',
      to_char(v_last + interval '30 days', 'DD/MM/YYYY');
  end if;

  v_code := public.generate_join_code();

  update public.organizations
     set join_code = v_code,
         last_changed_at = now(),
         join_code_rotated_at = now()
   where id = v_org_id;

  return v_code;
end $$;

-- ───────────────────────────────────────────────────────────────────────────────
--  9. Garde-fou : seul un administrateur peut créer une organisation
--     (sinon un employé pouvait s'auto-attribuer le rôle administrateur)
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.create_organization(p_name text, p_code text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_code   text;
  v_uid    uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Vous devez etre connecte.';
  end if;

  if not (public.is_super_admin() or public.is_org_admin()) then
    raise exception 'Seul un administrateur peut creer une organisation.';
  end if;

  -- Idempotent : si l'utilisateur a déjà une organisation, on renvoie sa clé
  -- existante au lieu d'en créer une deuxième.
  select organization_id into v_org_id
    from public.profiles where id = v_uid;

  if v_org_id is not null then
    select join_code into v_code from public.organizations where id = v_org_id;
    return v_code;
  end if;

  v_code := public.generate_join_code();

  insert into public.organizations (name, join_code, join_code_rotated_at)
  values (coalesce(nullif(trim(p_name), ''), 'Mon organisation'), v_code, now())
  returning id into v_org_id;

  update public.profiles
     set organization_id = v_org_id, role = 'admin'
   where id = v_uid;

  return v_code;
end $$;

revoke all on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;

-- ───────────────────────────────────────────────────────────────────────────────
--  10. Déclencheur d'inscription : c'est lui qui applique la règle
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
  v_code       text;   -- clé d'organisation partagée (équipes)
  v_adminkey   text;   -- clé d'inscription administrateur à usage unique
  v_org_id     uuid;
  v_supervisor uuid;
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

  -- ═══ ADMINISTRATEUR ═══════════════════════════════════════════════════════
  if v_role = 'admin' then
    -- Hors amorçage : une clé à usage unique émise par l'administrateur
    -- principal est OBLIGATOIRE. C'est elle qui autorise la création de la
    -- société, et elle est consommée au passage.
    if not v_first then
      if length(v_adminkey) < 4 then
        raise exception 'Cle d''inscription administrateur requise : demandez une cle a usage unique a l''administrateur principal de la plateforme.';
      end if;

      if not public.consume_admin_signup_key(v_adminkey, new.email, new.id) then
        raise exception 'Cle d''inscription administrateur invalide ou deja utilisee.';
      end if;
    end if;

    insert into public.profiles (id, email, username, full_name, company, role, avatar)
    values (
      new.id,
      new.email,
      v_username,
      v_fullname,
      coalesce(new.raw_user_meta_data ->> 'company', ''),
      'admin',
      upper(left(v_fullname, 2))
    )
    on conflict (id) do nothing;

    -- Création de SA société + de SA clé d'organisation aléatoire.
    insert into public.organizations (name, join_code, join_code_rotated_at)
    values (
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'company'), ''), 'Mon organisation'),
      public.generate_join_code(),
      now()
    )
    returning id into v_org_id;

    update public.profiles
       set organization_id = v_org_id
     where id = new.id;

    return new;
  end if;

  -- ═══ MANAGER / UTILISATEUR ═════════════════════════════════════════════════
  insert into public.profiles (id, email, username, full_name, company, role, avatar)
  values (
    new.id,
    new.email,
    v_username,
    v_fullname,
    coalesce(new.raw_user_meta_data ->> 'company', ''),
    v_role,
    upper(left(v_fullname, 2))
  )
  on conflict (id) do nothing;

  -- Rattachement à l'organisation grâce à la clé partagée par l'administrateur.
  if length(v_code) >= 4 then
    select o.id into v_org_id
      from public.organizations o
     where upper(regexp_replace(o.join_code, '[^A-Za-z0-9]', '', 'g')) = v_code
       and o.active = true
     limit 1;

    if v_org_id is not null then
      -- Un manager est encadré par l'administrateur, un utilisateur par le
      -- manager (ou, à défaut, par l'administrateur).
      if v_role = 'manager' then
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
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────────────────────────────────────────────────────────
--  Vérification
-- ───────────────────────────────────────────────────────────────────────────────
select proname, prorettype::regtype
  from pg_proc
 where proname in ('generate_admin_signup_code', 'create_admin_signup_key',
                    'list_admin_signup_keys', 'check_admin_signup_key',
                    'consume_admin_signup_key', 'revoke_admin_signup_key',
                    'rotate_join_code', 'create_organization', 'handle_new_user')
 order by proname;

-- Date de dernière rotation de la clé de chaque société (pour vérifier que la
-- règle des 30 jours ne bloque personne dès aujourd'hui) :
select name, join_code, last_changed_at, join_code_rotated_at
  from public.organizations order by name;
