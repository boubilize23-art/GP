-- ═══════════════════════════════════════════════════════════════════════════════
--  GESTIOPRO — Clés d'organisation aléatoires (une seule clé par société)
-- ═══════════════════════════════════════════════════════════════════════════════
--
--  MODÈLE
--
--  • L'administrateur crée le compte → sa société est créée automatiquement,
--    avec UNE clé aléatoire unique (12 caractères, ex. A3F9-72KD-91XZ).
--  • Il partage cette clé avec ses employés : ils la saisissent dans le
--    formulaire d'inscription et rejoignent la société.
--  • La clé n'est JAMAIS choisie à la main : elle est générée par le serveur
--    (PostgreSQL), ce qui garantit qu'elle est imprévisible et unique.
--  • Si l'administrateur fait tourner sa clé, l'ancienne cesse de fonctionner
--    immédiatement pour tous.
--
--  À exécuter UNE SEULE FOIS dans le SQL Editor de Supabase :
--    https://supabase.com/dashboard/project/bdoodzgwriyqsejspajf/sql/new
-- ═══════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────────
--  1. Générateur de clé aléatoire
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.generate_join_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_code    text;
  v_tentatives integer := 0;
begin
  loop
    -- 12 caractères hexadécimaux aléatoires (48 bits d'entropie)
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

-- ───────────────────────────────────────────────────────────────────────────────
--  2. Création d'organisation : clé toujours aléatoire, et idempotente
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

  -- Idempotent : si l'utilisateur a déjà une organisation, on renvoie sa clé
  -- existante au lieu d'en créer une deuxième.
  select organization_id into v_org_id
    from public.profiles where id = v_uid;

  if v_org_id is not null then
    select join_code into v_code from public.organizations where id = v_org_id;
    return v_code;
  end if;

  -- La clé est générée par le serveur : jamais choisie à la main.
  v_code := public.generate_join_code();

  insert into public.organizations (name, join_code)
  values (coalesce(nullif(trim(p_name), ''), 'Mon organisation'), v_code)
  returning id into v_org_id;

  update public.profiles
     set organization_id = v_org_id, role = 'admin'
   where id = v_uid;

  return v_code;
end $$;

-- ───────────────────────────────────────────────────────────────────────────────
--  3. Rotation de clé : nouvelle clé aléatoire (l'ancienne est invalidée)
-- ───────────────────────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────────────────────
--  4. Création de compte : société créée pour l'administrateur, rattachement
--     automatique pour les employés (fonctionne même avec confirmation par email)
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

  if v_role = 'admin' then
    -- ── Administrateur : création de sa société + de sa clé aléatoire ────────
    -- (fait ici et non dans l'application : avec la confirmation par email,
    --  l'utilisateur n'a pas encore de session au moment de s'inscrire)
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
    -- ── Employé : rattachement à la société grâce à la clé partagée ─────────
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

-- Vérification
select proname, prorettype::regtype
  from pg_proc
 where proname in ('generate_join_code', 'create_organization', 'rotate_join_code', 'handle_new_user')
 order by proname;
