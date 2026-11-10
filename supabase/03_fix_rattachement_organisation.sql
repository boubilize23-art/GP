-- ═══════════════════════════════════════════════════════════════════════════════
--  GESTIOPRO — Correctif : rattachement automatique à l'organisation
-- ═══════════════════════════════════════════════════════════════════════════════
--
--  POURQUOI CE CORRECTIF EST NÉCESSAIRE
--
--  L'application rattache un nouvel inscrit à son organisation en appelant la
--  fonction redeem_join_code(), mais uniquement quand l'inscription renvoie
--  immédiatement une session (c'est-à-dire quand la confirmation par email est
--  désactivée).
--
--  Or la confirmation par email est activée : l'inscription crée bien le compte,
--  mais l'utilisateur n'a pas encore de session. Le compte reste donc orphelin
--  (organization_id = null) et l'utilisateur ne voit aucune donnée.
--
--  Ce correctif déplace le rattachement dans le déclencheur handle_new_user(),
--  qui s'exécute à la création du compte : la clé d'organisation transmise par
--  l'application est vérifiée et le profil est rattaché immédiatement, quel que
--  soit l'appareil sur lequel l'utilisateur confirme son email.
--
--  À exécuter UNE SEULE FOIS dans le SQL Editor de Supabase :
--    https://supabase.com/dashboard/project/bdoodzgwriyqsejspajf/sql/new
-- ═══════════════════════════════════════════════════════════════════════════════

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
  v_code       text;
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

  -- Le tout premier compte de l'application est administrateur
  select not exists (select 1 from public.profiles) into v_first;
  if v_first then
    v_role := 'admin';
  elsif v_role = 'admin' then
    -- Un admin ne peut être créé que s'il en existe déjà un
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

  -- ── Rattachement automatique à l'organisation ─────────────────────────────
  if v_role <> 'admin' then
    v_code := upper(regexp_replace(
      coalesce(new.raw_user_meta_data ->> 'organization_key', ''), '[^A-Za-z0-9]', '', 'g'));

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
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Vérification : la fonction doit exposer bien les 2 paramètres attendus
select proname, prorettype::regtype
  from pg_proc
 where proname = 'handle_new_user';
