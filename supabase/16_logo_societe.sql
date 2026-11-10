-- ═══════════════════════════════════════════════════════════════════════════════
--  16 — LOGO DE LA SOCIÉTÉ  (factures, rapports, en-tête de l'application)
-- ═══════════════════════════════════════════════════════════════════════════════
--  • Chaque société peut déposer son propre logo.
--  • Le logo est stocké dans Supabase Storage (bucket public « logos »).
--  • Seuls l'administrateur de la société (et l'administrateur principal)
--    peuvent déposer ou supprimer le logo, et uniquement dans leur dossier.
--  • Script REJOUABLE (idempotent).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────────
--  1. La colonne qui porte l'URL publique du logo
-- ───────────────────────────────────────────────────────────────────────────────
alter table public.organizations
  add column if not exists logo_url text;

comment on column public.organizations.logo_url is
  'URL publique du logo de la societe (bucket Storage « logos »).';

-- ───────────────────────────────────────────────────────────────────────────────
--  2. Le bucket de stockage
--     Public : le logo doit s'afficher dans les factures et les rapports PDF,
--     y compris pour un lecteur qui n'a pas de compte.
-- ───────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ───────────────────────────────────────────────────────────────────────────────
--  3. Une fonction utilitaire : l'utilisateur connecté est-il
--     administrateur de SA société ?
--     (security definer : contourne la RLS de profiles, évite la récursion)
-- ───────────────────────────────────────────────────────────────────────────────
drop function if exists public.is_org_admin();
create or replace function public.is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role = 'admin' and p.is_active
       from public.profiles p
      where p.id = auth.uid()),
    false)
$$;

grant execute on function public.is_org_admin() to authenticated;

-- ───────────────────────────────────────────────────────────────────────────────
--  4. Qui peut déposer / remplacer / supprimer un logo ?
--     Règle : le premier dossier du chemin doit être l'identifiant de la société
--     de l'utilisateur (l'administrateur principal peut, lui, agir sur toute
--     société). L'écriture reste bloquée si la licence est expirée.
-- ───────────────────────────────────────────────────────────────────────────────

-- Lecture : le bucket est public, on ne pose pas de politique SELECT
-- (les URLs publiques sont lisibles par tout le monde, c'est voulu : le logo
--  doit figurer sur les factures).

drop policy if exists "logos insert" on storage.objects;
create policy "logos insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (
      (storage.foldername(name))[1] = public.current_organization_id()::text
      or public.is_super_admin()
    )
    and (public.is_org_admin() or public.is_super_admin())
    and public.org_write_allowed()
  );

drop policy if exists "logos update" on storage.objects;
create policy "logos update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and (
      (storage.foldername(name))[1] = public.current_organization_id()::text
      or public.is_super_admin()
    )
    and (public.is_org_admin() or public.is_super_admin())
    and public.org_write_allowed()
  )
  with check (
    bucket_id = 'logos'
    and (
      (storage.foldername(name))[1] = public.current_organization_id()::text
      or public.is_super_admin()
    )
    and (public.is_org_admin() or public.is_super_admin())
    and public.org_write_allowed()
  );

drop policy if exists "logos delete" on storage.objects;
create policy "logos delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos'
    and (
      (storage.foldername(name))[1] = public.current_organization_id()::text
      or public.is_super_admin()
    )
    and (public.is_org_admin() or public.is_super_admin())
  );

-- ───────────────────────────────────────────────────────────────────────────────
--  5. Vérification
-- ───────────────────────────────────────────────────────────────────────────────
select 'organisations.logo_url' as element,
       case when exists (
         select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'organizations'
            and column_name = 'logo_url')
       then 'OK' else 'MANQUANT' end as etat
union all
select 'bucket logos', case when exists (
         select 1 from storage.buckets where id = 'logos' and public)
       then 'OK (public)' else 'MANQUANT' end
union all
select 'politiques storage', case when (
         select count(*) from pg_policies
          where schemaname = 'storage' and tablename = 'objects'
            and policyname like 'logos %')
       = 3 then 'OK (3)' else 'INCOMPLETE' end
union all
select 'fonction is_org_admin', case when exists (
         select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'is_org_admin')
       then 'OK' else 'MANQUANT' end;
