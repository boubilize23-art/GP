-- ══════════════════════════════════════════════════════════════════════════════
-- 06 — Accès de l'administrateur principal aux DONNÉES MÉTIER de toutes les
--      sociétés (29 octobre 2026)
--
--  Objectif : le propriétaire de la plateforme doit pouvoir consulter et gérer
--  les données de n'importe quelle société cliente (Musa Fall, Aicha Ngaye…).
--
--  Isolation maintenue : tous les autres comptes (administrateur client,
--  manager, utilisateur) restent strictement cloisonnés sur LEUR société.
--  Un client qui appellerait l'API directement ne peut toujours pas lire ni
--  écrire dans les données d'une autre société.
--
--  L'administrateur principal est identifié par profiles.is_super_admin.
-- ══════════════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
begin
  foreach t in array array[
    'products', 'clients', 'suppliers', 'sales',
    'purchases', 'receivables', 'stock_movements', 'purchase_requests'
  ] loop
    -- Lecture : l'administrateur principal voit tout, les autres leur société.
    execute format('drop policy if exists %I on public.%I', t || '_org_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_super_admin() or organization_id = public.current_organization_id())',
      t || '_org_select', t);

    -- Écriture : l'administrateur principal peut aussi agir sur une autre société.
    execute format('drop policy if exists %I on public.%I', t || '_org_insert', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_super_admin() or organization_id = public.current_organization_id())',
      t || '_org_insert', t);

    execute format('drop policy if exists %I on public.%I', t || '_org_update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_super_admin() or organization_id = public.current_organization_id()) with check (public.is_super_admin() or organization_id = public.current_organization_id())',
      t || '_org_update', t);

    execute format('drop policy if exists %I on public.%I', t || '_org_delete', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_super_admin() or organization_id = public.current_organization_id())',
      t || '_org_delete', t);
  end loop;
end $$;

-- Vérification (à lancer après) :
--   select tablename, policyname, qual
--   from pg_policies where schemaname = 'public' and policyname like '%_org_%'
--   order by tablename, policyname;
