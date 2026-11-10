-- ═══════════════════════════════════════════════════════════════════════════════
--  GESTIOPRO — Schéma de la base Supabase
--  ───────────────────────────────────────────────────────────────────────────
--  Où exécuter ce script :
--    Supabase Dashboard → votre projet GestioPro → SQL Editor → New query
--    → collez ce fichier → clic sur « Run »
--
--  Ce script est idempotent : vous pouvez le relancer sans casse.
--  Il crée : les tables, les politiques RLS (sécurité), les fonctions,
--  et le déclencheur qui crée automatiquement le profil à l'inscription.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 0. Extensions
-- ───────────────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ───────────────────────────────────────────────────────────────────────────
-- 1. TABLES
-- ───────────────────────────────────────────────────────────────────────────

-- Organisations (l'équivalent de la « clé d'organisation » de l'app)
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null default 'Mon organisation',
  join_code   text        not null unique,
  description text,
  active      boolean     not null default true,
  created_at  timestamptz not null default now(),
  last_changed_at timestamptz not null default now()
);

-- Profils (le profil est lié 1-1 à un compte Supabase Auth)
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text        not null,
  username        text        not null unique,
  full_name       text        not null default '',
  company         text        not null default '',
  role            text        not null default 'user'
                    check (role in ('admin', 'manager', 'user')),
  avatar          text        not null default '',
  managed_by      uuid        references public.profiles (id) on delete set null,
  organization_id uuid        references public.organizations (id) on delete set null,
  is_active       boolean     not null default true,
  last_login      timestamptz,
  created_at      timestamptz not null default now()
);

-- Produits
create table if not exists public.products (
  id              uuid primary key,
  organization_id uuid        not null references public.organizations (id) on delete cascade,
  name            text        not null,
  category        text        not null default '',
  unit            text        not null default '',
  buy_price       numeric(14,2) not null default 0,
  sell_price      numeric(14,2) not null default 0,
  stock           numeric(14,2) not null default 0,
  min_stock       numeric(14,2) not null default 0,
  tva_rate        numeric(6,2)  not null default 0,
  created_at      date        not null default current_date
);

-- Clients
create table if not exists public.clients (
  id              uuid primary key,
  organization_id uuid        not null references public.organizations (id) on delete cascade,
  name            text        not null,
  phone           text        not null default '',
  email           text        not null default '',
  address         text        not null default '',
  balance         numeric(14,2) not null default 0,
  total_paid      numeric(14,2) not null default 0,
  payment_history jsonb       not null default '[]'::jsonb,
  created_at      date        not null default current_date
);

-- Fournisseurs
create table if not exists public.suppliers (
  id              uuid primary key,
  organization_id uuid        not null references public.organizations (id) on delete cascade,
  name            text        not null,
  contact         text        not null default '',
  phone           text        not null default '',
  email           text        not null default '',
  address         text        not null default '',
  balance         numeric(14,2) not null default 0,
  total_paid      numeric(14,2) not null default 0,
  payment_history jsonb       not null default '[]'::jsonb,
  created_at      date        not null default current_date
);

-- Ventes
create table if not exists public.sales (
  id              uuid primary key,
  organization_id uuid        not null references public.organizations (id) on delete cascade,
  ref             text        not null default '',
  client_id       uuid,
  client_name     text        not null default '',
  items           jsonb       not null default '[]'::jsonb,
  total_ht        numeric(14,2) not null default 0,
  total_tva       numeric(14,2) not null default 0,
  total           numeric(14,2) not null default 0,
  paid            numeric(14,2) not null default 0,
  date            date        not null default current_date,
  status          text        not null default 'unpaid'
                    check (status in ('paid', 'partial', 'unpaid'))
);

-- Achats
create table if not exists public.purchases (
  id              uuid primary key,
  organization_id uuid        not null references public.organizations (id) on delete cascade,
  ref             text        not null default '',
  supplier_id     uuid,
  supplier_name   text        not null default '',
  items           jsonb       not null default '[]'::jsonb,
  total_ht        numeric(14,2) not null default 0,
  total_tva       numeric(14,2) not null default 0,
  total           numeric(14,2) not null default 0,
  paid            numeric(14,2) not null default 0,
  date            date        not null default current_date,
  status          text        not null default 'unpaid'
                    check (status in ('paid', 'partial', 'unpaid'))
);

-- Créances
create table if not exists public.receivables (
  id              uuid primary key,
  organization_id uuid        not null references public.organizations (id) on delete cascade,
  client_id       uuid,
  client_name     text        not null default '',
  sale_id         uuid,
  sale_ref        text        not null default '',
  amount          numeric(14,2) not null default 0,
  paid            numeric(14,2) not null default 0,
  remaining       numeric(14,2) not null default 0,
  due_date        date,
  date            date        not null default current_date,
  status          text        not null default 'pending'
                    check (status in ('paid', 'partial', 'pending'))
);

-- Mouvements de stock
create table if not exists public.stock_movements (
  id              uuid primary key,
  organization_id uuid        not null references public.organizations (id) on delete cascade,
  product_id      uuid,
  product_name    text        not null default '',
  type            text        not null default 'in' check (type in ('in', 'out', 'adjust')),
  qty             numeric(14,2) not null default 0,
  reason          text        not null default '',
  date            date        not null default current_date,
  balance_before  numeric(14,2) not null default 0,
  balance_after   numeric(14,2) not null default 0
);

-- Demandes d'achat (circuit de validation)
create table if not exists public.purchase_requests (
  id                uuid primary key,
  organization_id   uuid        not null references public.organizations (id) on delete cascade,
  requested_by      uuid        not null,
  requested_by_name text        not null default '',
  requested_by_role text        not null default 'user',
  supplier_id       uuid,
  supplier_name     text        not null default '',
  items             jsonb       not null default '[]'::jsonb,
  total             numeric(14,2) not null default 0,
  date              date        not null default current_date,
  note              text        not null default '',
  status            text        not null default 'pending'
                      check (status in ('pending', 'approved', 'rejected')),
  reviewed_by       uuid,
  reviewed_by_name  text,
  reviewed_at       timestamptz,
  rejection_reason  text,
  created_at        timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. INDEX
-- ───────────────────────────────────────────────────────────────────────────
create index if not exists idx_products_org      on public.products (organization_id);
create index if not exists idx_clients_org      on public.clients (organization_id);
create index if not exists idx_suppliers_org    on public.suppliers (organization_id);
create index if not exists idx_sales_org        on public.sales (organization_id);
create index if not exists idx_purchases_org    on public.purchases (organization_id);
create index if not exists idx_receivables_org  on public.receivables (organization_id);
create index if not exists idx_stock_org        on public.stock_movements (organization_id);
create index if not exists idx_preqs_org        on public.purchase_requests (organization_id);
create index if not exists idx_profiles_org     on public.profiles (organization_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. FONCTIONS
-- ───────────────────────────────────────────────────────────────────────────

-- Organisation de l'utilisateur connecté (contourne RLS : évite la récursion)
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

-- Rôle de l'utilisateur connecté
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- L'utilisateur connecté est-il administrateur ?
create or replace function public.is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- Ce pseudo-username est-il déjà pris ? (appelable avant inscription)
create or replace function public.username_exists(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where lower(username) = lower(coalesce(p_username, ''))
  )
$$;

-- Retrouver l'email à partir du pseudo (connexion par identifiant)
create or replace function public.email_by_username(p_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.profiles
   where lower(username) = lower(coalesce(p_username, ''))
   limit 1
$$;

-- Retrouver le pseudo à partir de l'email (mot de passe oublié)
create or replace function public.username_by_email(p_email text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select username from public.profiles
   where lower(email) = lower(coalesce(p_email, ''))
   limit 1
$$;

-- Vérifier une clé d'organisation sans rattacher le compte
-- La comparaison se fait sur la forme « canonique » (sans tirets) des deux côtés,
-- pour que 'GEST-2025-DEMO', 'GEST2025DEMO' et 'gest2025demo' soient equivalents.
create or replace function public.check_join_code(p_code text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select name from public.organizations
   where upper(regexp_replace(join_code, '[^A-Za-z0-9]', '', 'g'))
       = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
     and active = true
   limit 1
$$;

-- Génère une clé d'organisation aléatoire et unique (12 caractères).
-- La clé n'est jamais choisie à la main : une seule clé par société,
-- imprévisible, impossible à deviner.
create or replace function public.generate_join_code()
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
      select 1 from public.organizations
       where upper(regexp_replace(join_code, '[^A-Za-z0-9]', '', 'g')) = v_code
    );

    v_tentatives := v_tentatives + 1;
    if v_tentatives > 20 then
      raise exception 'Impossible de generer une cle unique. Reessayez.';
    end if;
  end loop;

  return v_code;
end $$;

-- Crée l'organisation de l'utilisateur connecté et renvoie sa clé.
-- Le premier compte créé sur l'application devient administrateur.
-- La clé est toujours générée par le serveur (aléatoire, unique par société).
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

  -- Idempotent : si l'utilisateur a déjà une organisation, on renvoie sa clé
  -- existante au lieu d'en créer une deuxième.
  select organization_id into v_org_id
    from public.profiles where id = v_uid;

  if v_org_id is not null then
    select join_code into v_code from public.organizations where id = v_org_id;
    return v_code;
  end if;

  v_code := public.generate_join_code();

  insert into public.organizations (name, join_code)
  values (coalesce(nullif(trim(p_name), ''), 'Mon organisation'), v_code)
  returning id into v_org_id;

  update public.profiles
     set organization_id = v_org_id, role = 'admin'
   where id = v_uid;

  return v_code;
end $$;

-- Fait tourner la clé d'organisation de l'utilisateur connecté (administrateur).
-- La nouvelle clé est générée par le serveur : l'ancienne cesse immédiatement
-- de fonctionner pour toute l'organisation.
create or replace function public.rotate_join_code(p_code text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code   text;
  v_org_id uuid := public.current_organization_id();
begin
  if v_org_id is null then
    raise exception 'Vous n''avez pas d''organisation.';
  end if;
  if not public.is_org_admin() then
    raise exception 'Seul un administrateur peut modifier la cle.';
  end if;

  v_code := public.generate_join_code();

  update public.organizations
     set join_code = v_code, last_changed_at = now()
   where id = v_org_id;

  return v_code;
end $$;

-- Utilise une clé d'organisation pour rattacher l'utilisateur connecté.
-- L'encadrant est attribué automatiquement :
--   • un manager   → l'administrateur de l'organisation
--   • un utilisateur → le manager de l'organisation, sinon l'administrateur
create or replace function public.redeem_join_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_uid    uuid := auth.uid();
  v_role   text;
  v_supervisor uuid;
begin
  if v_uid is null then return false; end if;

  select id into v_org_id
    from public.organizations
   where upper(regexp_replace(join_code, '[^A-Za-z0-9]', '', 'g'))
       = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
     and active = true;

  if v_org_id is null then return false; end if;

  select role into v_role from public.profiles where id = v_uid;

  if v_role = 'manager' then
    select id into v_supervisor from public.profiles
     where organization_id = v_org_id and role = 'admin' and is_active = true
     limit 1;
  else
    select id into v_supervisor from public.profiles
     where organization_id = v_org_id and role = 'manager' and is_active = true
     limit 1;
    if v_supervisor is null then
      select id into v_supervisor from public.profiles
       where organization_id = v_org_id and role = 'admin' and is_active = true
       limit 1;
    end if;
  end if;

  update public.profiles
     set organization_id = v_org_id,
         managed_by = coalesce(managed_by, v_supervisor)
   where id = v_uid and organization_id is null;

  return exists (
    select 1 from public.profiles where id = v_uid and organization_id = v_org_id
  );
end $$;

-- Nom + clé de l'organisation de l'utilisateur connecté
create or replace function public.my_organization()
returns table (name text, join_code text)
language sql
stable
security definer
set search_path = public
as $$
  select o.name, o.join_code
    from public.organizations o
   where o.id = public.current_organization_id()
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. DÉCLENCHEURS
-- ───────────────────────────────────────────────────────────────────────────

-- Crée le profil automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role      text;
  v_username  text;
  v_fullname  text;
  v_first     boolean;
  v_code      text;
  v_org_id    uuid;
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

  -- Le tout premier compte de l'application est administrateur
  select not exists (select 1 from public.profiles) into v_first;
  if v_first then
    v_role := 'admin';
  elsif v_role = 'admin' and length(v_code) >= 4 then
    -- Un administrateur ne peut pas rejoindre une organisation existante :
    -- il crée la sienne (et reçoit alors une clé aléatoire).
    v_role := 'user';
  end if;

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

  -- ── Organisation du nouveau compte ──────────────────────────────────────────
  -- Indispensable quand la confirmation par email est activée : le compte
  -- existe mais l'utilisateur n'a pas encore de session au moment de
  -- s'inscrire, l'application ne peut donc pas faire le rattachement.
  if v_role = 'admin' then
    -- Administrateur : création de sa société et de sa clé aléatoire.
    insert into public.organizations (name, join_code)
    values (
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'company'), ''), 'Mon organisation'),
      public.generate_join_code()
    )
    returning id into v_org_id;

    update public.profiles
       set organization_id = v_org_id
     where id = new.id;

  else
    -- Employé : rattachement à la société grâce à la clé partagée par l'admin.
    if length(v_code) >= 4 then
      select o.id into v_org_id
        from public.organizations o
       where upper(regexp_replace(o.join_code, '[^A-Za-z0-9]', '', 'g')) = v_code
         and o.active = true
       limit 1;

      if v_org_id is not null then
        -- Un manager est encadré par l'administrateur, un utilisateur par le manager
        -- (ou, à défaut, par l'administrateur).
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
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Garde-fou : un utilisateur simple ne peut pas s'auto-attribuer un rôle
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_org_admin() then
    if new.role is distinct from old.role then
      new.role := old.role;
    end if;
    if new.organization_id is distinct from old.organization_id then
      new.organization_id := old.organization_id;
    end if;
    if new.is_active is distinct from old.is_active then
      new.is_active := old.is_active;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists on_profiles_protect on public.profiles;
create trigger on_profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ───────────────────────────────────────────────────────────────────────────
-- 5. SÉCURITÉ (RLS) — chaque utilisateur ne voit que SON organisation
-- ───────────────────────────────────────────────────────────────────────────

alter table public.organizations     enable row level security;
alter table public.profiles          enable row level security;
alter table public.products          enable row level security;
alter table public.clients           enable row level security;
alter table public.suppliers         enable row level security;
alter table public.sales             enable row level security;
alter table public.purchases         enable row level security;
alter table public.receivables       enable row level security;
alter table public.stock_movements   enable row level security;
alter table public.purchase_requests enable row level security;

-- Organisations : lecture de la sienne, écriture par les admins
drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations for select to authenticated
  using (id = public.current_organization_id());

drop policy if exists org_admin_all on public.organizations;
create policy org_admin_all on public.organizations for all to authenticated
  using (public.is_org_admin() and id = public.current_organization_id())
  with check (public.is_org_admin() and id = public.current_organization_id());

-- Profils : on voit son organisation ; un admin gère les membres
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (organization_id = public.current_organization_id() or id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_org_admin())
  with check (id = auth.uid() or public.is_org_admin());

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles for delete to authenticated
  using (public.is_org_admin());

-- ── Règle générique appliquée aux 8 tables métier ──────────────────────────
-- (organization_id = organisation de l'utilisateur connecté)

do $$
declare
  t text;
begin
  foreach t in array array[
    'products', 'clients', 'suppliers', 'sales',
    'purchases', 'receivables', 'stock_movements', 'purchase_requests'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_org_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (organization_id = public.current_organization_id())',
      t || '_org_select', t);

    execute format('drop policy if exists %I on public.%I', t || '_org_insert', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (organization_id = public.current_organization_id())',
      t || '_org_insert', t);

    execute format('drop policy if exists %I on public.%I', t || '_org_update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id())',
      t || '_org_update', t);

    execute format('drop policy if exists %I on public.%I', t || '_org_delete', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (organization_id = public.current_organization_id())',
      t || '_org_delete', t);
  end loop;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. DROITS
-- ───────────────────────────────────────────────────────────────────────────

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  public.organizations, public.profiles, public.products, public.clients,
  public.suppliers, public.sales, public.purchases, public.receivables,
  public.stock_movements, public.purchase_requests
  to authenticated;

grant execute on function public.username_exists(text) to anon, authenticated;
grant execute on function public.email_by_username(text) to anon, authenticated;
grant execute on function public.username_by_email(text) to anon, authenticated;
grant execute on function public.check_join_code(text) to anon, authenticated;
grant execute on function public.create_organization(text, text) to authenticated;
grant execute on function public.rotate_join_code(text) to authenticated;
grant execute on function public.redeem_join_code(text) to authenticated;
grant execute on function public.my_organization() to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
--  FIN DU SCHÉMA — pouvez maintenant exécuter 02_comptes_demo.sql (optionnel)
-- ═══════════════════════════════════════════════════════════════════════════════
