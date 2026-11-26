-- StudyFlow 2.0 - Migración v8: Organización por Carpetas para Redacción & Trabajos (study_works.folder_id)
-- Script idempotente para ejecutar en Supabase SQL Editor o migraciones.

alter table public.study_works
  add column if not exists folder_id text references public.folders (id) on delete set null;

create index if not exists study_works_folder_idx
  on public.study_works (user_id, folder_id);

