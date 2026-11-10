-- ═══════════════════════════════════════════════════════════════════════════════
--  GESTIOPRO — Comptes de démonstration (OPTIONNEL)
--  ───────────────────────────────────────────────────────────────────────────
--  À exécuter APRÈS 01_schema.sql, dans le même SQL Editor.
--
--  Ces 3 comptes sont créés directement en base, donc leur email est déjà
--  « confirmé » : ils peuvent se connecter immédiatement, sans email à valider.
--
--  ⚠️ Si vous relancez ce script, les comptes déjà présents sont ignorés.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Rend la fonction crypt() (pgcrypto) accessible, où qu'elle soit installée.
set search_path = public, extensions;

-- ── 1. L'organisation par défaut ──────────────────────────────────────────────
insert into public.organizations (name, join_code, description)
values ('GestioPro SARL', 'GEST-2025-DEMO', 'Organisation de démonstration')
on conflict (join_code) do nothing;

-- ── 2. Création des comptes ──────────────────────────────────────────────────
do $$
declare
  v_accounts jsonb := '[
    {"email":"admin@gestiopro.com","password":"Admin@2025","username":"admin","full_name":"Administrateur Principal","role":"admin"},
    {"email":"manager@gestiopro.com","password":"Manager@2025","username":"manager","full_name":"Manager Commercial","role":"manager"},
    {"email":"utilisateur@gestiopro.com","password":"User@2025","username":"utilisateur","full_name":"Utilisateur Standard","role":"user"}
  ]';
  v_row     record;
  v_user_id uuid;
  v_org_id  uuid;
begin
  select id into v_org_id from public.organizations where join_code = 'GEST-2025-DEMO';

  for v_row in
    select * from jsonb_to_recordset(v_accounts) as t(
      email     text,
      password  text,
      username  text,
      full_name text,
      role      text
    )
  loop
    -- On ne recrée pas un compte déjà existant
    if exists (select 1 from auth.users where email = v_row.email) then
      raise notice 'Compte % deja present - ignore.', v_row.email;
      continue;
    end if;

    v_user_id := gen_random_uuid();

    -- ── Le compte ───────────────────────────────────────────────────────────
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_row.email,
      crypt(v_row.password, gen_salt('bf', 10)),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'full_name', v_row.full_name,
        'username',  v_row.username,
        'company',   'GestioPro SARL',
        'role',      v_row.role
      )
    );

    -- Les colonnes de jeton doivent valoir '' (jamais NULL), sinon GoTrue
    -- refuse de lire la ligne. On n'ecrit que celles qui existent vraiment.
    execute format(
      'update auth.users set %s where id = %L',
      coalesce(
        (
          select string_agg(format('%I = %L', c.column_name, ''), ', ')
            from information_schema.columns c
           where c.table_schema = 'auth'
             and c.table_name   = 'users'
             and c.column_name in (
               'confirmation_token', 'email_change', 'email_change_token_new',
               'email_change_token_current', 'recovery_token',
               'phone_change', 'phone_change_token'
             )
        ),
        'updated_at = updated_at'
      ),
      v_user_id
    );

    -- ── L'identite de connexion ────────────────────────────────────────────
    -- Depuis 2023, provider_id est obligatoire : pour le fournisseur « email »
    -- sa valeur est l'UUID de l'utilisateur en texte.
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'auth' and table_name = 'identities'
         and column_name  = 'provider_id'
    ) then
      insert into auth.identities (
        id, user_id, provider, provider_id, identity_data,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(),
        v_user_id,
        'email',
        v_user_id::text,
        jsonb_build_object(
          'sub',            v_user_id::text,
          'email',          v_row.email,
          'email_verified', true,
          'phone_verified', false
        ),
        now(), now(), now()
      );
    else
      insert into auth.identities (
        id, user_id, provider, identity_data,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(),
        v_user_id,
        'email',
        jsonb_build_object(
          'sub',            v_user_id::text,
          'email',          v_row.email,
          'email_verified', true,
          'phone_verified', false
        ),
        now(), now(), now()
      );
    end if;

    raise notice 'Compte % cree.', v_row.email;
  end loop;
end $$;

-- ── 3. Rattachement à l'organisation et aux rôles ───────────────────────────
update public.profiles p
   set organization_id = (select id from public.organizations where join_code = 'GEST-2025-DEMO')
 where p.organization_id is null;

update public.profiles set role = 'admin'   where username = 'admin';
update public.profiles set role = 'manager' where username = 'manager';
update public.profiles set role = 'user'    where username = 'utilisateur';

-- Le manager est encadré par l'admin, l'utilisateur par le manager
update public.profiles p
   set managed_by = (select id from public.profiles where username = 'admin')
 where p.username = 'manager';

update public.profiles p
   set managed_by = (select id from public.profiles where username = 'manager')
 where p.username = 'utilisateur';

-- ── 4. Vérification ──────────────────────────────────────────────────────────
select
  p.username,
  p.role,
  o.name as organisation,
  o.join_code
from public.profiles p
left join public.organizations o on o.id = p.organization_id
order by p.role desc, p.username;

-- ═══════════════════════════════════════════════════════════════════════════════
--  Comptes prêts :
--    admin@gestiopro.com       / Admin@2025    (administrateur)
--    manager@gestiopro.com     / Manager@2025  (manager)
--    utilisateur@gestiopro.com / User@2025    (utilisateur)
--  Clé d'organisation : GEST-2025-DEMO
-- ═══════════════════════════════════════════════════════════════════════════════
