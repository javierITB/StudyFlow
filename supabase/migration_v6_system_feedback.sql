-- StudyFlow 2.0 - Migración v6: Buzón de Sugerencias y Feedback Administrativo
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase para habilitar
-- la sincronización bidireccional entre la web pública y el panel de administración.

create table if not exists public.system_feedback (
  id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  author_name text not null,
  author_email text not null,
  category text not null default 'general',
  priority text not null default 'media',
  status text not null default 'pendiente',
  title text not null,
  description text not null,
  votes integer not null default 1,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_feedback enable row level security;
grant select, insert, update, delete on table public.system_feedback to anon, authenticated;

-- Políticas permisivas de lectura e inserción para estudiantes autenticados y anónimos
drop policy if exists "Feedback select policy" on public.system_feedback;
create policy "Feedback select policy" on public.system_feedback for select to anon, authenticated using (true);

drop policy if exists "Feedback insert policy" on public.system_feedback;
create policy "Feedback insert policy" on public.system_feedback for insert to anon, authenticated with check (true);

drop policy if exists "Feedback update policy" on public.system_feedback;
create policy "Feedback update policy" on public.system_feedback for update to anon, authenticated using (true);

drop policy if exists "Feedback delete policy" on public.system_feedback;
create policy "Feedback delete policy" on public.system_feedback for delete to anon, authenticated using (true);

