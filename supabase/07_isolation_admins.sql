-- ══════════════════════════════════════════════════════════════════════════════
-- 07 — Les administrateurs clients ne voient plus les comptes des
--      administrateurs principaux (29 octobre 2026)
--
--  Exemple : elzo (boubilize23@gmail.com) est administrateur de la société
--  « GestioPro SARL ». Il ne doit voir que son propre compte et les comptes de
--  ses employés — PAS le compte de l'administrateur principal de la plateforme,
--  même s'il est dans la même société.
--
--  Ce script SUIT 05_admin_principal.sql (qui reste valable pour tout le
--  reste) et 06_admin_principal_donnees.sql (données métier).
-- ══════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────────
-- 1. Fonctions d'aide (SECURITY DEFINER : indispensable, sinon la politique
--    profiles_select se rappelle elle-même → récursion infinie)
-- ───────────────────────────────────────────────────────────────────────────────

-- Le profil donné est-il un administrateur principal ?
create or replace function public.is_super_admin_profile(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_super_admin from public.profiles p where p.id = p_id), false)
$$;

-- L'utilisateur connecté est-il manager ?
create or replace function public.is_org_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.role = 'manager' from public.profiles p where p.id = auth.uid()), false)
$$;

-- ───────────────────────────────────────────────────────────────────────────────
-- 2. Politiques RLS — profils
-- ───────────────────────────────────────────────────────────────────────────────

-- Lecture :
--   • administrateur principal → tous les comptes, toutes sociétés ;
--   • soi-même ;
--   • administrateur client → les comptes de SA société, sauf les comptes
--     d'administrateurs principaux (ils ne doivent pas les voir) ;
--   • manager → ses seuls subordonnés.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    public.is_super_admin()
    or id = auth.uid()
    or (
      public.is_org_admin()
      and organization_id = public.current_organization_id()
      and not public.is_super_admin_profile(id)
    )
    or (
      public.is_org_manager()
      and managed_by = auth.uid()
    )
  );

-- Modification : mêmes règles que la lecture.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (
    public.is_super_admin()
    or id = auth.uid()
    or (
      public.is_org_admin()
      and organization_id = public.current_organization_id()
      and not public.is_super_admin_profile(id)
    )
    or (
      public.is_org_manager()
      and managed_by = auth.uid()
    )
  )
  with check (
    public.is_super_admin()
    or id = auth.uid()
    or (
      public.is_org_admin()
      and organization_id = public.current_organization_id()
      and not public.is_super_admin_profile(id)
    )
    or (
      public.is_org_manager()
      and managed_by = auth.uid()
    )
  );

-- Suppression :
--   • administrateur principal → n'importe qui (sauf lui-même : le dernier
--     administrateur principal est protégé par le déclencheur) ;
--   • administrateur client → les membres de sa société, ni les admins
--     principaux, ni un autre administrateur ;
--   • manager → ses subordonnés « utilisateur ».
drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles for delete to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_org_admin()
      and organization_id = public.current_organization_id()
      and role <> 'admin'
      and not public.is_super_admin_profile(id)
    )
    or (
      public.is_org_manager()
      and managed_by = auth.uid()
      and role = 'user'
    )
  );

-- ───────────────────────────────────────────────────────────────────────────────
-- 3. Déclencheur : les droits ne se modifient que par l'administrateur principal
--    (empêche un manager de promouvoir son subordonné en administrateur).
--    Le blocage / déblocage (is_active) reste autorisé pour un admin client.
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_super      boolean := false;
  v_admin      boolean := false;
  v_super_count integer := 0;
begin
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  select coalesce(p.is_super_admin, false), (p.role = 'admin')
    into v_super, v_admin
    from public.profiles p
   where p.id = auth.uid();

  -- ── Suppression ──────────────────────────────────────────────────────────────
  if tg_op = 'DELETE' then
    if old.is_super_admin and not v_super then
      select count(*) into v_super_count
        from public.profiles p where p.is_super_admin;
      if v_super_count <= 1 then
        raise exception 'Impossible de supprimer le dernier administrateur principal.';
      end if;
    end if;
    if not v_super and v_admin and old.role = 'admin' and old.id <> auth.uid() then
      raise exception 'Un administrateur ne peut pas supprimer un autre administrateur.';
    end if;
    return old;
  end if;

  -- ── Mise à jour ──────────────────────────────────────────────────────────────
  if old.id = auth.uid() then
    if new.is_super_admin is distinct from old.is_super_admin
       or new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or (
         new.organization_id is distinct from old.organization_id
         and old.organization_id is not null
       ) then
      raise exception 'Vous ne pouvez pas modifier votre propre role, votre societe ni vos droits.';
    end if;
    return new;
  end if;

  -- Un administrateur client ne touche pas aux autres administrateurs.
  if not v_super and v_admin and old.role = 'admin' then
    raise exception 'Un administrateur ne peut pas modifier un autre administrateur.';
  end if;

  -- Seuls les droits (role, societe, administrateur principal, rattachement
  -- hierarchique) sont reserves a l'administrateur principal. Le blocage
  -- (is_active) reste libre pour un administrateur client sur ses employes.
  if not v_super then
    if new.role is distinct from old.role
       or new.is_super_admin is distinct from old.is_super_admin
       or new.organization_id is distinct from old.organization_id
       or new.managed_by is distinct from old.managed_by then
      raise exception 'Seul l administrateur principal peut modifier les droits ou le rattachement d un compte.';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before update or delete on public.profiles
  for each row execute function public.protect_profile_privileges();

-- ───────────────────────────────────────────────────────────────────────────────
-- 4. elzo n'est plus administrateur principal : il devient administrateur
--    client de sa société (« GestioPro SARL »).
--    (l'administrateur principal de la plateforme reste admin@gestiopro.com)
-- ───────────────────────────────────────────────────────────────────────────────
update public.profiles
   set is_super_admin = false
 where email = 'boubilize23@gmail.com';

-- ───────────────────────────────────────────────────────────────────────────────
-- Vérification :
--   select email, role, is_super_admin, organization_id
--     from public.profiles order by email;
-- ══════════════════════════════════════════════════════════════════════════════
