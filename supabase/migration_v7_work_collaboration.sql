-- StudyFlow 2.0 - Migración v7: Redacción Colaborativa y Compartición de Redacciones (work_shares, work_share_links)
-- Script idempotente para ejecutar en Supabase SQL Editor o migraciones.

-- 1. Tabla de compartición de redacciones entre amigos (work_shares)
create table if not exists public.work_shares (
  id uuid primary key default gen_random_uuid(),
  work_id text not null references public.study_works (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  share_mode text not null check (share_mode in ('copy', 'collaborative')),
  role text not null default 'viewer' check (role in ('viewer', 'collaborator')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_shares_no_self check (owner_id <> recipient_id)
);

create index if not exists work_shares_work_idx on public.work_shares (work_id);
create index if not exists work_shares_owner_idx on public.work_shares (owner_id);
create index if not exists work_shares_recipient_idx on public.work_shares (recipient_id, status);

alter table public.work_shares enable row level security;
grant select, insert, update, delete on table public.work_shares to authenticated;

-- Políticas RLS para work_shares
drop policy if exists "Users view own work shares" on public.work_shares;
create policy "Users view own work shares"
  on public.work_shares for select
  to authenticated
  using ((select auth.uid()) = owner_id or (select auth.uid()) = recipient_id);

drop policy if exists "Owners create work shares" on public.work_shares;
create policy "Owners create work shares"
  on public.work_shares for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners and recipients update work shares" on public.work_shares;
create policy "Owners and recipients update work shares"
  on public.work_shares for update
  to authenticated
  using ((select auth.uid()) = owner_id or (select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = owner_id or (select auth.uid()) = recipient_id);

drop policy if exists "Owners and recipients delete work shares" on public.work_shares;
create policy "Owners and recipients delete work shares"
  on public.work_shares for delete
  to authenticated
  using ((select auth.uid()) = owner_id or (select auth.uid()) = recipient_id);

-- 2. Tabla de enlaces de invitación a redacciones (?shareWork=TOKEN)
create table if not exists public.work_share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  work_id text not null references public.study_works (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  share_mode text not null check (share_mode in ('copy', 'collaborative')),
  role text not null default 'viewer' check (role in ('viewer', 'collaborator')),
  revoked boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists work_share_links_work_idx on public.work_share_links (work_id);
create index if not exists work_share_links_owner_idx on public.work_share_links (owner_id);

alter table public.work_share_links enable row level security;
grant select, insert, update, delete on table public.work_share_links to authenticated;

drop policy if exists "Owners manage own work share links" on public.work_share_links;
create policy "Owners manage own work share links"
  on public.work_share_links for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- 3. Actualizar políticas de study_works para permitir acceso de lectura y edición a colaboradores
drop policy if exists "Users select own study works" on public.study_works;
create policy "Users select own study works"
  on public.study_works for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.work_shares ws
      where ws.work_id = study_works.id
        and ws.recipient_id = (select auth.uid())
        and ws.share_mode = 'collaborative'
        and ws.status = 'accepted'
    )
  );

drop policy if exists "Users update own study works" on public.study_works;
create policy "Users update own study works"
  on public.study_works for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.work_shares ws
      where ws.work_id = study_works.id
        and ws.recipient_id = (select auth.uid())
        and ws.share_mode = 'collaborative'
        and ws.role = 'collaborator'
        and ws.status = 'accepted'
    )
  )
  with check (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.work_shares ws
      where ws.work_id = study_works.id
        and ws.recipient_id = (select auth.uid())
        and ws.share_mode = 'collaborative'
        and ws.role = 'collaborator'
        and ws.status = 'accepted'
    )
  );

-- 4. Función RPC para canjear enlace de invitación a redacción (?shareWork=TOKEN)
create or replace function public.redeem_work_share_link(p_token text)
returns table (
  share_id uuid,
  work_id text,
  work_title text,
  content_html text,
  content_text text,
  word_count integer,
  paper_size text,
  target_word_count integer,
  tags jsonb,
  owner_id uuid,
  owner_username text,
  share_mode text,
  role text,
  status text
)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_link public.work_share_links%rowtype;
  v_work public.study_works%rowtype;
  v_owner_username text;
  v_share_id uuid;
  v_target_status text;
begin
  if v_uid is null then
    raise exception 'DEBES_INICIAR_SESION';
  end if;

  select * into v_link
  from public.work_share_links sl
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

  select * into v_work
  from public.study_works sw
  where sw.id = v_link.work_id
  limit 1;

  if not found then
    raise exception 'DOCUMENTO_NO_ENCONTRADO';
  end if;

  select p.username into v_owner_username
  from public.profiles p
  where p.id = v_link.owner_id;

  v_target_status := case when v_link.share_mode = 'collaborative' then 'accepted' else 'pending' end;

  select ws.id into v_share_id
  from public.work_shares ws
  where ws.work_id = v_link.work_id
    and ws.owner_id = v_link.owner_id
    and ws.recipient_id = v_uid
    and ws.share_mode = v_link.share_mode
    and ws.status <> 'revoked'
  limit 1;

  if v_share_id is null then
    insert into public.work_shares (
      work_id,
      owner_id,
      recipient_id,
      share_mode,
      role,
      status
    ) values (
      v_link.work_id,
      v_link.owner_id,
      v_uid,
      v_link.share_mode,
      v_link.role,
      v_target_status
    )
    returning id into v_share_id;
  else
    update public.work_shares
      set role = v_link.role,
          status = v_target_status,
          updated_at = now()
      where id = v_share_id;
  end if;

  return query
  select
    v_share_id,
    v_work.id,
    v_work.title,
    v_work.content_html,
    v_work.content_text,
    v_work.word_count,
    v_work.paper_size,
    v_work.target_word_count,
    v_work.tags,
    v_link.owner_id,
    v_owner_username,
    v_link.share_mode,
    v_link.role,
    v_target_status;
end;
$$;

grant execute on function public.redeem_work_share_link(text) to authenticated;

-- 5. Habilitar publicación Realtime para work_shares
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'work_shares'
  ) then
    alter publication supabase_realtime add table public.work_shares;
  end if;
end;
$$;

