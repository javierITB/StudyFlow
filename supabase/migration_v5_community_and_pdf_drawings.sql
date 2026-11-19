-- StudyFlow 2.0 - Migración v5: Plantillas Comunitarias Públicas & Trazos en PDF
-- Script idempotente para ejecutar en el SQL Editor o migraciones de Supabase.

-- 1. Tabla de Plantillas Comunitarias Públicas
create table if not exists public.community_templates (
  id text primary key,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  author_username text,
  title text not null,
  category text not null,
  technical_profile text not null default 'General',
  description text not null default '',
  target_words integer not null default 0,
  paper_size text not null default 'letter',
  content_html text not null,
  content_text text not null default '',
  tags jsonb not null default '[]'::jsonb,
  avg_rating numeric(3, 2) not null default 0.0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_templates_rating_idx
  on public.community_templates (avg_rating desc, rating_count desc);
create index if not exists community_templates_category_idx
  on public.community_templates (category, technical_profile);
create index if not exists community_templates_created_idx
  on public.community_templates (created_at desc);

alter table public.community_templates enable row level security;

grant select on table public.community_templates to anon;
grant select, insert, update, delete on table public.community_templates to authenticated;

-- Políticas de seguridad para plantillas comunitarias
drop policy if exists "Authenticated users view community templates" on public.community_templates;
drop policy if exists "Public read community templates" on public.community_templates;
create policy "Public read community templates"
  on public.community_templates for select
  to anon, authenticated
  using (true);

drop policy if exists "Users insert own community template" on public.community_templates;
create policy "Users insert own community template"
  on public.community_templates for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

drop policy if exists "Users update own community template" on public.community_templates;
create policy "Users update own community template"
  on public.community_templates for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

drop policy if exists "Users delete own community template" on public.community_templates;
create policy "Users delete own community template"
  on public.community_templates for delete
  to authenticated
  using ((select auth.uid()) = author_id);


-- 2. Tabla de Calificaciones de Plantillas (1 a 5 estrellas)
create table if not exists public.template_ratings (
  id uuid primary key default gen_random_uuid(),
  template_id text not null references public.community_templates (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, user_id)
);

create index if not exists template_ratings_tpl_idx
  on public.template_ratings (template_id);
create index if not exists template_ratings_usr_idx
  on public.template_ratings (user_id);

alter table public.template_ratings enable row level security;

grant select on table public.template_ratings to anon;
grant select, insert, update, delete on table public.template_ratings to authenticated;

drop policy if exists "Authenticated users read ratings" on public.template_ratings;
drop policy if exists "Public read template ratings" on public.template_ratings;
create policy "Public read template ratings"
  on public.template_ratings for select
  to anon, authenticated
  using (true);

drop policy if exists "Users insert own rating" on public.template_ratings;
create policy "Users insert own rating"
  on public.template_ratings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own rating" on public.template_ratings;
create policy "Users update own rating"
  on public.template_ratings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own rating" on public.template_ratings;
create policy "Users delete own rating"
  on public.template_ratings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Función y trigger para mantener avg_rating y rating_count calculados automáticamente
create or replace function public.recompute_template_rating()
returns trigger as $$
declare
  target_id text;
begin
  target_id := coalesce(new.template_id, old.template_id);
  update public.community_templates
  set
    avg_rating = coalesce((
      select round(avg(rating)::numeric, 2)
      from public.template_ratings
      where template_id = target_id
    ), 0.0),
    rating_count = (
      select count(*)
      from public.template_ratings
      where template_id = target_id
    ),
    updated_at = now()
  where id = target_id;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_recompute_template_rating on public.template_ratings;
create trigger tr_recompute_template_rating
after insert or update or delete on public.template_ratings
for each row execute function public.recompute_template_rating();


-- 3. Tabla de Trazos y Destacados en PDF a Mano Alzada
create table if not exists public.pdf_drawings (
  id text primary key,
  doc_id text not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  page integer not null,
  strokes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (doc_id, page, user_id)
);

create index if not exists pdf_drawings_doc_page_idx
  on public.pdf_drawings (doc_id, page);

alter table public.pdf_drawings enable row level security;

grant select, insert, update, delete on table public.pdf_drawings to authenticated;

drop policy if exists "Users manage own pdf drawings" on public.pdf_drawings;
create policy "Users manage own pdf drawings"
  on public.pdf_drawings for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

