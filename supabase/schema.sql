-- StudyFlow 2.0 - Esquema Supabase (Auth + Postgres + Storage + RLS)
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase.

create extension if not exists "pgcrypto";

-- 1. Perfiles de estudiante y configuracion de metodo de estudio
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  study_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Carpetas / Categorias por ramo
create table if not exists public.folders (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default 'indigo',
  created_at timestamptz not null default now()
);

alter table public.folders enable row level security;

create policy "Users manage own folders"
  on public.folders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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

create policy "Users manage own documents"
  on public.documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Notas adhesivas y tarjetas de pizarra
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
  created_at timestamptz not null default now()
);

create index if not exists notes_user_doc_idx on public.notes (user_id, doc_id);
alter table public.notes enable row level security;

create policy "Users manage own notes"
  on public.notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Lista de tareas de estudio
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

create policy "Users manage own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Planes y rutas generadas por estudiante
create table if not exists public.study_plans (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.study_plans enable row level security;

create policy "Users manage own study plans"
  on public.study_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 7. Bucket privado para archivos binarios (PDF / DOCX / PPTX)
insert into storage.buckets (id, name, public)
values ('study-files', 'study-files', false)
on conflict (id) do nothing;

create policy "Users upload own study files"
  on storage.objects for insert
  with check (
    bucket_id = 'study-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own study files"
  on storage.objects for select
  using (
    bucket_id = 'study-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own study files"
  on storage.objects for update
  using (
    bucket_id = 'study-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own study files"
  on storage.objects for delete
  using (
    bucket_id = 'study-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

