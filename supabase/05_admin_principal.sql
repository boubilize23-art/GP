-- ═══════════════════════════════════════════════════════════════════════════════
--  GESTIOPRO — Administrateur principal (propriétaire) vs administrateurs clients
--  ─────────────────────────────────────────────────────────────────────────────
--  À exécuter APRÈS 01_schema.sql et 04_cles_aleatoires.sql.
--  Script idempotent : on peut le relancer sans risque.
--
--  LE MODÈLE
--    • ADMINISTRATEUR PRINCIPAL (profiles.is_super_admin = true)
--      Il possède la plateforme : il voit TOUTES les organisations et TOUS les
--      comptes (toutes sociétés confondues) et peut les gérer : bloquer,
--      supprimer, réinitialiser le mot de passe.
--
--    • ADMINISTRATEUR CLIENT (role = 'admin')
--      Il ne voit que SA société et les membres de SA société. Il ne peut ni
--      voir, ni modifier, ni supprimer un compte d'une autre société.
--
--    • MANAGER (role = 'manager')     → ses subordonnés uniquement.
--    • UTILISATEUR (role = 'user')    → lui-même uniquement.
--
--  ⚠️ Ce script corrige aussi deux failles des versions précédentes :
--    1. les politiques profiles_update / profiles_admin_delete ne filtraient pas
--       sur organization_id → un administrateur pouvait modifier ou supprimer le
--       profil d'une AUTRE société ;
--    2. rien n'empêchait un utilisateur de changer lui-même son role, son
--       organization_id ou son is_active via l'API (escalade de privilèges).
-- ═══════════════════════════════════════════════════════════════════════════════

set search_path = public, extensions;

-- ───────────────────────────────────────────────────────────────────────────────
-- 1. Colonne « administrateur principal »
-- ───────────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

comment on column public.profiles.is_super_admin is
  'Administrateur principal de la plateforme : voit et gere toutes les organisations.';

create index if not exists idx_profiles_super
  on public.profiles (is_super_admin) where is_super_admin;

-- ───────────────────────────────────────────────────────────────────────────────
-- 2. L'utilisateur connecté est-il administrateur principal ?
--    SECURITY DEFINER : obligatoire, sinon la fonction se rappelle elle-même
--    via la politique profiles_select → récursion infinie.
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_super_admin from public.profiles p where p.id = auth.uid()),
    false
  )
$$;

-- ───────────────────────────────────────────────────────────────────────────────
-- 3. Politiques RLS — organizations
-- ───────────────────────────────────────────────────────────────────────────────
drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations for select to authenticated
  using (id = public.current_organization_id() or public.is_super_admin());

drop policy if exists org_admin_all on public.organizations;
create policy org_admin_all on public.organizations for all to authenticated
  using (
    public.is_super_admin()
    or (public.is_org_admin() and id = public.current_organization_id())
  )
  with check (
    public.is_super_admin()
    or (public.is_org_admin() and id = public.current_organization_id())
  );

-- ───────────────────────────────────────────────────────────────────────────────
-- 4. Politiques RLS — profiles
-- ───────────────────────────────────────────────────────────────────────────────
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    public.is_super_admin()
    or organization_id = public.current_organization_id()
    or id = auth.uid()
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (
    public.is_super_admin()
    or id = auth.uid()
    or (public.is_org_admin() and organization_id = public.current_organization_id())
  )
  with check (
    public.is_super_admin()
    or id = auth.uid()
    or (public.is_org_admin() and organization_id = public.current_organization_id())
  );

-- Un administrateur client peut supprimer les membres de sa société, mais pas
-- un autre administrateur : seul l'administrateur principal y a le droit.
drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles for delete to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_org_admin()
      and organization_id = public.current_organization_id()
      and role <> 'admin'
    )
  );

-- ───────────────────────────────────────────────────────────────────────────────
-- 5. Protection des colonnes de pouvoir
--    RLS filtre les LIGNES accessibles, pas les COLONNES modifiables. Ce
--    déclencheur empêche :
--      • un utilisateur de s'attribuer un rôle, une société ou des droits ;
--      • un administrateur client de s'en prendre à un autre administrateur ;
--      • la suppression du dernier administrateur principal de la plateforme.
-- ───────────────────────────────────────────────────────────────────────────────
-- L'ancien garde-fou (protect_profile_fields, défini dans 01_schema.sql)
-- annulait SILENCIEUSEMENT toute tentative de changement de rôle : aucune
-- erreur n'était renvoyée, la modification était simplement écrasée. On le
-- retire au profit du déclencheur ci-dessous, plus strict, qui refuse aussi
-- les changements de société, de droits et d'état d'activation, et qui
-- remonte une erreur explicite.
drop trigger if exists on_profiles_protect on public.profiles;
drop function if exists public.protect_profile_fields();

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
  -- Exécution directe en SQL (migrations, script de démo) : pas d'auth.uid(),
  -- donc pas de garde-fou possible — c'est le rôle postgres, il a tous les droits.
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
  -- Personne ne change ses propres droits.
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

  return new;
end $$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before update or delete on public.profiles
  for each row execute function public.protect_profile_privileges();

-- ───────────────────────────────────────────────────────────────────────────────
-- 6. Réinitialisation du mot de passe d'un compte par un administrateur
--    (l'email de récupération ne part pas vers les clients : le SMTP de
--    Supabase est réservé aux membres de l'équipe).
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_set_password(p_user_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_caller       uuid := auth.uid();
  v_caller_super boolean := false;
  v_caller_admin boolean := false;
  v_caller_org   uuid;
  v_target_org   uuid;
  v_target_super boolean := false;
  v_target_ok    boolean := false;
  v_super_count  integer := 0;
begin
  if v_caller is null then
    raise exception 'Non authentifie.';
  end if;

  select coalesce(p.is_super_admin, false), (p.role = 'admin'), p.organization_id
    into v_caller_super, v_caller_admin, v_caller_org
    from public.profiles p
   where p.id = v_caller;

  if not found then
    raise exception 'Profil introuvable.';
  end if;

  select p.organization_id, coalesce(p.is_super_admin, false)
    into v_target_org, v_target_super
    from public.profiles p
   where p.id = p_user_id;

  v_target_ok := found;

  if not v_target_ok then
    raise exception 'Compte introuvable.';
  end if;

  if v_caller_super then
    if p_user_id = v_caller then
      raise exception 'Utilisez « Mon profil » pour changer votre propre mot de passe.';
    end if;
    -- On ne bloque pas la plateforme : il doit rester au moins un
    -- administrateur principal.
    if v_target_super then
      select count(*) into v_super_count
        from public.profiles p where p.is_super_admin;
      if v_super_count <= 1 then
        raise exception 'Impossible de modifier le dernier administrateur principal.';
      end if;
    end if;
  else
    -- Un administrateur client : uniquement les membres de SA société,
    -- et jamais un administrateur.
    if not v_caller_admin or v_caller_org is distinct from v_target_org then
      raise exception 'Droits insuffisants : ce compte n''appartient pas a votre societe.';
    end if;
    if v_target_super then
      raise exception 'Droits insuffisants.';
    end if;
  end if;

  if p_password is null or length(p_password) < 8 then
    raise exception 'Mot de passe trop court (8 caracteres minimum).';
  end if;

  update auth.users
     set encrypted_password = crypt(p_password, gen_salt('bf', 10)),
         updated_at = now()
   where id = p_user_id;

  -- Les colonnes de jeton doivent valoir '' (jamais NULL), sinon GoTrue refuse
  -- de lire la ligne.
  update auth.users
     set confirmation_token        = '',
         email_change               = '',
         email_change_token_new     = '',
         email_change_token_current = '',
         recovery_token             = '',
         phone_change               = '',
         phone_change_token         = ''
   where id = p_user_id;
end $$;

revoke all on function public.admin_set_password(uuid, text) from public;
grant execute on function public.admin_set_password(uuid, text) to authenticated;

-- ───────────────────────────────────────────────────────────────────────────────
-- 7. Qui est administrateur principal ?
--    ⚠️ À ADAPTER : mettez l'email DU PROPRIÉTAIRE DE LA PLATEFORME.
--    Pour retirer l'accès :
--      update public.profiles set is_super_admin = false where email = '...';
-- ───────────────────────────────────────────────────────────────────────────────
update public.profiles set is_super_admin = true
 where email in ('boubilize23@gmail.com', 'admin@gestiopro.com');

-- ───────────────────────────────────────────────────────────────────────────────
-- 8. Vérification
-- ───────────────────────────────────────────────────────────────────────────────
select
  p.username,
  p.email,
  p.role,
  p.is_super_admin,
  o.name as organisation,
  o.join_code
from public.profiles p
left join public.organizations o on o.id = p.organization_id
order by p.is_super_admin desc, o.name, p.role desc, p.username;
