-- StudyFlow 2.0 - Esquema Completo Supabase (Auth + @username + Amistades + Colaboración + Storage + RLS + Realtime)
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase para instalaciones nuevas.
-- Si ya tenías la versión v1 instalada, ejecuta `supabase/migration_v2_collaboration.sql`.

create extension if not exists "pgcrypto";

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- 1. Perfiles de estudiante, @username único y configuración de estudio
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  username text,
  study_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint profiles_username_format_check check (username is null or username ~ '^[a-z0-9_]{3,24}$')
);

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_raw_username text;
  v_clean_username text;
begin
  v_raw_username := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '^@+', ''));
  if v_raw_username ~ '^[a-z0-9_]{3,24}$' then
    v_clean_username := v_raw_username;
  else
    v_clean_username := null;
  end if;

  insert into public.profiles (id, email, full_name, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    v_clean_username
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
        username = coalesce(public.profiles.username, excluded.username);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_username_available(p_username text)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  v_clean text;
begin
  v_clean := lower(regexp_replace(trim(coalesce(p_username, '')), '^@+', ''));
  if v_clean !~ '^[a-z0-9_]{3,24}$' then
    return false;
  end if;
  if v_clean = any(array['admin', 'administrator', 'studyflow', 'support', 'soporte', 'system', 'sistema', 'root']) then
    return false;
  end if;
  return not exists (
    select 1 from public.profiles
    where lower(username) = v_clean
      and id <> coalesce((select auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid)
  );
end;
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

create or replace function public.resolve_login_email(p_identifier text)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_ident text;
  v_email text;
begin
  v_ident := lower(trim(coalesce(p_identifier, '')));
  if v_ident = '' then
    return null;
  end if;
  if position('@' in v_ident) > 1 then
    return v_ident;
  end if;
  v_ident := regexp_replace(v_ident, '^@+', '');
  select p.email into v_email
  from public.profiles p
  where lower(p.username) = v_ident
  limit 1;
  return v_email;
end;
$$;

grant execute on function public.resolve_login_email(text) to anon, authenticated;

create or replace function public.search_public_profiles(p_query text)
returns table (
  id uuid,
  username text,
  full_name text
)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_clean text;
begin
  if v_uid is null then
    return;
  end if;
  v_clean := lower(regexp_replace(trim(coalesce(p_query, '')), '^@+', ''));
  if length(v_clean) < 2 then
    return;
  end if;
  return query
  select p.id, p.username, p.full_name
  from public.profiles p
  where p.username is not null
    and p.id <> v_uid
    and (
      lower(p.username) like v_clean || '%'
      or lower(coalesce(p.full_name, '')) like '%' || v_clean || '%'
    )
  order by (lower(p.username) = v_clean) desc, p.username asc
  limit 12;
end;
$$;

revoke execute on function public.search_public_profiles(text) from anon;
grant execute on function public.search_public_profiles(text) to authenticated;

create or replace function public.get_public_profiles_by_ids(p_ids uuid[])
returns table (
  id uuid,
  username text,
  full_name text
)
language plpgsql
security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return;
  end if;
  return query
  select p.id, p.username, p.full_name
  from public.profiles p
  where p.id = any(p_ids);
end;
$$;

revoke execute on function public.get_public_profiles_by_ids(uuid[]) from anon;
grant execute on function public.get_public_profiles_by_ids(uuid[]) to authenticated;

-- 2. Carpetas / Categorias por ramo
create table if not exists public.folders (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default 'indigo',
  created_at timestamptz not null default now()
);

create index if not exists folders_user_id_idx on public.folders (user_id);
alter table public.folders enable row level security;

drop policy if exists "Users manage own folders" on public.folders;
create policy "Users manage own folders"
  on public.folders for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 3. Metadatos de Documentos (PDF, DOCX, PPTX)
create table if not exists public.documents (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  folder_id text references public.folders (id) on delete set null,
  name text not null,
  file_type text not null check (file_type in ('pdf', 'docx', 'pptx')),
  size bigint not null default 0,
  page_count integer not null default 1,
  current_page integer not null default 1,
  storage_path text,
  upload_date timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents (user_id);
alter table public.documents enable row level security;

-- 4. Amistades, Document Shares y Share Links
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id)
);

create unique index if not exists friendships_pair_unique_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

drop policy if exists "Users view own friendships" on public.friendships;
create policy "Users view own friendships"
  on public.friendships for select
  to authenticated
  using ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id);

drop policy if exists "Users send friend requests" on public.friendships;
create policy "Users send friend requests"
  on public.friendships for insert
  to authenticated
  with check ((select auth.uid()) = requester_id and status = 'pending');

drop policy if exists "Users update own friendships" on public.friendships;
create policy "Users update own friendships"
  on public.friendships for update
  to authenticated
  using ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id)
  with check ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id);

drop policy if exists "Users delete own friendships" on public.friendships;
create policy "Users delete own friendships"
  on public.friendships for delete
  to authenticated
  using ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id);

create table if not exists public.document_shares (
  id uuid primary key default gen_random_uuid(),
  doc_id text not null references public.documents (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  share_mode text not null check (share_mode in ('copy', 'collaborative')),
  include_notes boolean not null default false,
  role text not null default 'viewer' check (role in ('viewer', 'collaborator')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_shares_no_self check (owner_id <> recipient_id)
);

create index if not exists document_shares_doc_idx on public.document_shares (doc_id);
create index if not exists document_shares_owner_idx on public.document_shares (owner_id);
create index if not exists document_shares_recipient_idx on public.document_shares (recipient_id, status);

alter table public.document_shares enable row level security;

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  doc_id text not null references public.documents (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  share_mode text not null check (share_mode in ('copy', 'collaborative')),
  include_notes boolean not null default false,
  role text not null default 'viewer' check (role in ('viewer', 'collaborator')),
  revoked boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists share_links_doc_idx on public.share_links (doc_id);
create index if not exists share_links_owner_idx on public.share_links (owner_id);

alter table public.share_links enable row level security;

create or replace function private.are_friends(u1 uuid, u2 uuid)
returns boolean
language sql
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = u1 and f.addressee_id = u2)
        or (f.requester_id = u2 and f.addressee_id = u1)
      )
  );
$$;

create or replace function private.is_doc_owner(p_doc_id text)
returns boolean
language sql
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.documents d
    where d.id = p_doc_id
      and d.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_read_doc(p_doc_id text)
returns boolean
language sql
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.documents d
    where d.id = p_doc_id
      and d.user_id = (select auth.uid())
  ) or exists (
    select 1 from public.document_shares ds
    where ds.doc_id = p_doc_id
      and ds.recipient_id = (select auth.uid())
      and ds.share_mode = 'collaborative'
      and ds.status = 'accepted'
  );
$$;

create or replace function private.can_collaborate_doc(p_doc_id text)
returns boolean
language sql
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.documents d
    where d.id = p_doc_id
      and d.user_id = (select auth.uid())
  ) or exists (
    select 1 from public.document_shares ds
    where ds.doc_id = p_doc_id
      and ds.recipient_id = (select auth.uid())
      and ds.share_mode = 'collaborative'
      and ds.role = 'collaborator'
      and ds.status = 'accepted'
  );
$$;

create or replace function private.can_access_shared_copy_source(p_doc_id text)
returns boolean
language sql
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.document_shares ds
    where ds.doc_id = p_doc_id
      and ds.recipient_id = (select auth.uid())
      and ds.status in ('pending', 'accepted')
  );
$$;

grant execute on function private.are_friends(uuid, uuid) to authenticated;
grant execute on function private.is_doc_owner(text) to authenticated;
grant execute on function private.can_read_doc(text) to authenticated;
grant execute on function private.can_collaborate_doc(text) to authenticated;
grant execute on function private.can_access_shared_copy_source(text) to authenticated;

drop policy if exists "Owners and recipients view shares" on public.document_shares;
create policy "Owners and recipients view shares"
  on public.document_shares for select
  to authenticated
  using ((select auth.uid()) = owner_id or (select auth.uid()) = recipient_id);

drop policy if exists "Owners share with friends" on public.document_shares;
create policy "Owners share with friends"
  on public.document_shares for insert
  to authenticated
  with check (
    (select auth.uid()) = owner_id
    and private.is_doc_owner(doc_id)
    and private.are_friends(owner_id, recipient_id)
  );

drop policy if exists "Owners and recipients update shares" on public.document_shares;
create policy "Owners and recipients update shares"
  on public.document_shares for update
  to authenticated
  using ((select auth.uid()) = owner_id or (select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = owner_id or (select auth.uid()) = recipient_id);

drop policy if exists "Owners and recipients delete shares" on public.document_shares;
create policy "Owners and recipients delete shares"
  on public.document_shares for delete
  to authenticated
  using ((select auth.uid()) = owner_id or (select auth.uid()) = recipient_id);

drop policy if exists "Owners manage own share links" on public.share_links;
create policy "Owners manage own share links"
  on public.share_links for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id and private.is_doc_owner(doc_id));

create or replace function public.redeem_share_link(p_token text)
returns table (
  share_id uuid,
  doc_id text,
  doc_name text,
  file_type text,
  size bigint,
  page_count integer,
  storage_path text,
  owner_id uuid,
  owner_username text,
  share_mode text,
  include_notes boolean,
  role text,
  status text
)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_link public.share_links%rowtype;
  v_doc public.documents%rowtype;
  v_owner_username text;
  v_share_id uuid;
  v_target_status text;
begin
  if v_uid is null then
    raise exception 'DEBES_INICIAR_SESION';
  end if;

  select * into v_link
  from public.share_links sl
  where sl.token = trim(p_token)
    and sl.revoked = false
    and (sl.expires_at is null or sl.expires_at > now())
  limit 1;

  if not found then
    raise exception 'ENLACE_INVALIDO_O_EXPIRADO';
  end if;

  if v_link.owner_id = v_uid then
    raise exception 'PROPIO_DOCUMENTO';
  end if;

  select * into v_doc
  from public.documents d
  where d.id = v_link.doc_id
  limit 1;

  if not found then
    raise exception 'DOCUMENTO_NO_ENCONTRADO';
  end if;

  select p.username into v_owner_username
  from public.profiles p
  where p.id = v_link.owner_id;

  v_target_status := case when v_link.share_mode = 'collaborative' then 'accepted' else 'pending' end;

  select ds.id into v_share_id
  from public.document_shares ds
  where ds.doc_id = v_link.doc_id
    and ds.owner_id = v_link.owner_id
    and ds.recipient_id = v_uid
    and ds.share_mode = v_link.share_mode
    and ds.status <> 'revoked'
  limit 1;

  if v_share_id is null then
    insert into public.document_shares (
      doc_id, owner_id, recipient_id, share_mode, include_notes, role, status
    ) values (
      v_link.doc_id, v_link.owner_id, v_uid, v_link.share_mode, v_link.include_notes, v_link.role, v_target_status
    )
    returning id into v_share_id;
  else
    update public.document_shares
      set role = v_link.role,
          include_notes = v_link.include_notes,
          status = case when status = 'accepted' then 'accepted' else v_target_status end,
          updated_at = now()
      where id = v_share_id;
  end if;

  return query
  select
    v_share_id,
    v_doc.id,
    v_doc.name,
    v_doc.file_type,
    v_doc.size,
    v_doc.page_count,
    v_doc.storage_path,
    v_doc.user_id,
    v_owner_username,
    v_link.share_mode,
    v_link.include_notes,
    v_link.role,
    v_target_status;
end;
$$;

revoke execute on function public.redeem_share_link(text) from anon;
grant execute on function public.redeem_share_link(text) to authenticated;

-- Políticas de documentos
drop policy if exists "Users manage own documents" on public.documents;
drop policy if exists "Users select own or shared documents" on public.documents;
create policy "Users select own or shared documents"
  on public.documents for select
  to authenticated
  using ((select auth.uid()) = user_id or private.can_access_shared_copy_source(id));

drop policy if exists "Users insert own documents" on public.documents;
create policy "Users insert own documents"
  on public.documents for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own documents" on public.documents;
create policy "Users update own documents"
  on public.documents for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own documents" on public.documents;
create policy "Users delete own documents"
  on public.documents for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 5. Notas adhesivas y tarjetas de pizarra
create table if not exists public.notes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  doc_id text references public.documents (id) on delete cascade,
  page integer,
  x_ratio double precision,
  y_ratio double precision,
  content text not null default '',
  color text not null default 'yellow',
  zone text not null default 'ideas',
  is_shared boolean not null default false,
  author_username text,
  created_at timestamptz not null default now()
);

create index if not exists notes_user_doc_idx on public.notes (user_id, doc_id);
create index if not exists notes_doc_shared_idx on public.notes (doc_id, is_shared);
alter table public.notes enable row level security;

drop policy if exists "Users manage own notes" on public.notes;
drop policy if exists "Users select own or shared doc notes" on public.notes;
create policy "Users select own or shared doc notes"
  on public.notes for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (
      doc_id is not null
      and is_shared = true
      and private.can_read_doc(doc_id)
    )
    or (
      doc_id is not null
      and exists (
        select 1 from public.document_shares ds
        where ds.doc_id = notes.doc_id
          and ds.recipient_id = (select auth.uid())
          and ds.share_mode = 'copy'
          and ds.include_notes = true
          and ds.status in ('pending', 'accepted')
          and (notes.user_id = ds.owner_id or notes.is_shared = true)
      )
    )
    or (
      doc_id is not null
      and private.is_doc_owner(doc_id)
      and is_shared = true
    )
  );

drop policy if exists "Users insert notes on own or collaborative docs" on public.notes;
create policy "Users insert notes on own or collaborative docs"
  on public.notes for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (doc_id is null or private.can_collaborate_doc(doc_id))
  );

drop policy if exists "Users update own notes" on public.notes;
create policy "Users update own notes"
  on public.notes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Authors or doc owners delete notes" on public.notes;
create policy "Authors or doc owners delete notes"
  on public.notes for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (doc_id is not null and is_shared = true and private.is_doc_owner(doc_id))
  );

-- 6. Lista de tareas de estudio
create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  doc_id text references public.documents (id) on delete set null,
  folder_id text references public.folders (id) on delete set null,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
alter table public.tasks enable row level security;

drop policy if exists "Users manage own tasks" on public.tasks;
create policy "Users manage own tasks"
  on public.tasks for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 7. Planes y rutas generadas por estudiante
create table if not exists public.study_plans (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists study_plans_user_id_idx on public.study_plans (user_id);
alter table public.study_plans enable row level security;

drop policy if exists "Users manage own study plans" on public.study_plans;
create policy "Users manage own study plans"
  on public.study_plans for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 8. Bucket privado para archivos binarios (PDF / DOCX / PPTX)
insert into storage.buckets (id, name, public)
values ('study-files', 'study-files', false)
on conflict (id) do nothing;

drop policy if exists "Users upload own study files" on storage.objects;
create policy "Users upload own study files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'study-files'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users read own study files" on storage.objects;
drop policy if exists "Users read own or shared study files" on storage.objects;
create policy "Users read own or shared study files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'study-files'
    and (
      (select auth.uid())::text = (storage.foldername(name))[1]
      or exists (
        select 1
        from public.document_shares ds
        where ds.owner_id::text = (storage.foldername(name))[1]
          and ds.doc_id = (storage.foldername(name))[2]
          and ds.recipient_id = (select auth.uid())
          and ds.status in ('pending', 'accepted')
      )
    )
  );

drop policy if exists "Users update own study files" on storage.objects;
create policy "Users update own study files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'study-files'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete own study files" on storage.objects;
create policy "Users delete own study files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'study-files'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- 9. Realtime para notas compartidas, solicitudes y documentos compartidos
alter table public.notes replica identity full;
alter table public.document_shares replica identity full;
alter table public.friendships replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notes'
  ) then
    alter publication supabase_realtime add table public.notes;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'document_shares'
  ) then
    alter publication supabase_realtime add table public.document_shares;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships'
  ) then
    alter publication supabase_realtime add table public.friendships;
  end if;
end $$;
