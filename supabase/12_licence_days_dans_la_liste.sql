-- ═══════════════════════════════════════════════════════════════════════════
--  GESTIOPRO — Correctif 12 : la liste des clés d'inscription administrateur
--  expose désormais la durée de licence accordée (licence_days).
--  (À exécuter APRÈS le script 11)
-- ═══════════════════════════════════════════════════════════════════════════

-- Le type de retour change (nouvelle colonne licence_days) : PostgreSQL
-- impose de supprimer l'ancienne version avant de la recréer.
drop function if exists public.list_admin_signup_keys();

create or replace function public.list_admin_signup_keys()
returns table (
  id           uuid,
  code         text,
  label        text,
  created_at   timestamptz,
  expires_at   timestamptz,
  used_at      timestamptz,
  used_email   text,
  revoked_at   timestamptz,
  licence_days integer
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
           k.used_at, k.used_email, k.revoked_at, k.licence_days
      from public.admin_signup_keys k
     order by k.created_at desc;
end $$;

revoke all on function public.list_admin_signup_keys() from public;
grant execute on function public.list_admin_signup_keys() to authenticated;

select proname, prorettype::regtype
  from pg_proc
 where proname = 'list_admin_signup_keys';
