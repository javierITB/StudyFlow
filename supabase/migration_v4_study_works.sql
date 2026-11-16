-- StudyFlow 2.0 - Migración v4: Sincronización de Redacción & Trabajos (study_works)
-- Script idempotente para ejecutar en el SQL Editor o migraciones de Supabase.

create table if not exists public.study_works (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Trabajo sin título',
  content_html text not null default '',
  content_text text not null default '',
  word_count integer not null default 0,
  target_word_count integer,
  tags jsonb not null default '[]'::jsonb,
  linked_doc_id text references public.documents (id) on delete set null,
  paper_size text not null default 'letter',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_works_user_updated_idx
  on public.study_works (user_id, updated_at desc);

alter table public.study_works enable row level security;

grant select, insert, update, delete on table public.study_works to authenticated;

drop policy if exists "Users select own study works" on public.study_works;
create policy "Users select own study works"
  on public.study_works for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own study works" on public.study_works;
create policy "Users insert own study works"
  on public.study_works for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own study works" on public.study_works;
create policy "Users update own study works"
  on public.study_works for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own study works" on public.study_works;
create policy "Users delete own study works"
  on public.study_works for delete
  to authenticated
  using ((select auth.uid()) = user_id);

