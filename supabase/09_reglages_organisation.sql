-- ══════════════════════════════════════════════════════════════════════════════
-- 09 — Réglages de la société : devise et exercices partagés entre tous les
--      appareils (29 octobre 2026)
--
--  La devise et les exercices étaient enregistrés dans le navigateur de chaque
--  utilisateur : deux appareils de la même société pouvaient afficher des
--  montants différents (l'un en euros, l'autre en francs CFA).
--
--  On les range désormais dans la base : UNE ligne par organisation.
--    • lecture  → tous les membres de la société ;
--    • écriture → les administrateurs de la société (et l'administrateur
--                  principal de la plateforme).
--
--  Ce script SUIT 05_admin_principal.sql, 06_admin_principal_donnees.sql et
--  07_isolation_admins.sql.
-- ══════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────────
-- 1. Table des réglages (une ligne par société)
-- ───────────────────────────────────────────────────────────────────────────────
create table if not exists public.org_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  -- La devise est stockée en JSON : {"code","symbol","name","locale"}
  -- (\u20ac = € ; on l'écrit ainsi pour rester en ASCII dans ce fichier)
  currency        jsonb not null default '{"code":"EUR","symbol":"\u20ac","name":"Euro","locale":"fr-FR"}'::jsonb,
  -- La liste des exercices : [{"id","label","startDate","endDate","status","createdAt"}]
  fiscal_years    jsonb not null default '[]'::jsonb,
  updated_at      timestamptz not null default now()
);

comment on table public.org_settings is
  'Réglages communs de la société (devise, exercices) : une ligne par organisation.';

-- ───────────────────────────────────────────────────────────────────────────────
-- 2. RLS — c'est la base qui applique les règles, pas l'interface
-- ───────────────────────────────────────────────────────────────────────────────
alter table public.org_settings enable row level security;

-- Lecture : les membres de MA société + l'administrateur principal (toutes sociétés)
drop policy if exists org_settings_select on public.org_settings;
create policy org_settings_select on public.org_settings for select to authenticated
  using (
    organization_id = public.current_organization_id()
    or public.is_super_admin()
  );

-- Création : un administrateur de MA société (ou l'administrateur principal)
drop policy if exists org_settings_insert on public.org_settings;
create policy org_settings_insert on public.org_settings for insert to authenticated
  with check (
    (public.is_org_admin() and organization_id = public.current_organization_id())
    or public.is_super_admin()
  );

-- Modification : mêmes règles que la création
drop policy if exists org_settings_update on public.org_settings;
create policy org_settings_update on public.org_settings for update to authenticated
  using (
    (public.is_org_admin() and organization_id = public.current_organization_id())
    or public.is_super_admin()
  )
  with check (
    (public.is_org_admin() and organization_id = public.current_organization_id())
    or public.is_super_admin()
  );

-- ───────────────────────────────────────────────────────────────────────────────
-- 3. Horodatage de la dernière modification
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.touch_org_settings_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists org_settings_touch on public.org_settings;
create trigger org_settings_touch
  before update on public.org_settings
  for each row execute function public.touch_org_settings_updated_at();

-- ───────────────────────────────────────────────────────────────────────────────
-- 4. Droits
-- ───────────────────────────────────────────────────────────────────────────────
grant select, insert, update on public.org_settings to authenticated;

-- ───────────────────────────────────────────────────────────────────────────────
-- 5. Vérification
-- ───────────────────────────────────────────────────────────────────────────────
--   select organization_id, currency, jsonb_array_length(fiscal_years), updated_at
--     from public.org_settings;
