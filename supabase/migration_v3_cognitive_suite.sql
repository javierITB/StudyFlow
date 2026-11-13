-- StudyFlow 2.0 - Migración v3: Suite Cognitiva (FSRS, Cornell, Feynman, Oclusiones e Interleaving por Fecha Límite)
-- Script idempotente para ejecutar en el SQL Editor de Supabase.

-- 1. Fecha límite individual por documento para ponderar Interleaving
alter table public.documents
  add column if not exists deadline timestamptz;

-- 2. Metadatos enriquecidos sobre notas (FSRS, campos Cornell y Técnica Feynman)
alter table public.notes
  add column if not exists meta jsonb not null default '{}'::jsonb;

-- 3. Cajas de oclusión visual sobre páginas de documentos (Active Recall + FSRS)
create table if not exists public.document_occlusions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  doc_id text not null references public.documents (id) on delete cascade,
  page integer not null default 1,
  x_ratio double precision not null,
  y_ratio double precision not null,
  width_ratio double precision not null,
  height_ratio double precision not null,
  label text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists document_occlusions_user_doc_idx
  on public.document_occlusions (user_id, doc_id);

alter table public.document_occlusions enable row level security;

drop policy if exists "Users view own or shared doc occlusions" on public.document_occlusions;
create policy "Users view own or shared doc occlusions"
  on public.document_occlusions for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or private.can_read_doc(doc_id)
  );

drop policy if exists "Users insert own or collaborative occlusions" on public.document_occlusions;
create policy "Users insert own or collaborative occlusions"
  on public.document_occlusions for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and private.can_collaborate_doc(doc_id)
  );

drop policy if exists "Users update own occlusions" on public.document_occlusions;
create policy "Users update own occlusions"
  on public.document_occlusions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own occlusions" on public.document_occlusions;
create policy "Users delete own occlusions"
  on public.document_occlusions for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    or private.is_doc_owner(doc_id)
  );

