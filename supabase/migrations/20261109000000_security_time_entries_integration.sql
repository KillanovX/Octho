-- =============================================================
-- Octho — Migração 2026-11-09
-- 1. Papéis (pending/member/admin) e RLS real no lugar de "using (true)"
-- 2. Tabela time_entries (horas com data) e clients
-- 3. Campos de integração com o vault Obsidian / Hermes Agent
--
-- Idempotente: pode ser executada mais de uma vez.
-- Aplicar no SQL Editor do projeto Supabase do Octho ou via `supabase db push`.
-- =============================================================

-- ─── 1. Perfis e papéis ──────────────────────────────────────
alter table public.profiles alter column role set default 'pending';
update public.profiles set role = 'member' where role is null or role = 'user';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('pending', 'member', 'admin'));
  end if;
end $$;

-- Bootstrap do administrador (ajuste o e-mail se necessário)
update public.profiles set role = 'admin' where lower(email) = 'flavio.adsv@gmail.com';

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role in ('member', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Perfil criado automaticamente para todo usuário do Auth.
-- Cadastro público entra como 'pending' (sem acesso aos dados) até um admin aprovar.
-- Usuários criados pela API de admin recebem app_metadata.octho_role (só a service role grava app_metadata).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text := coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1));
  v_role text := coalesce(new.raw_app_meta_data ->> 'octho_role', 'pending');
begin
  if v_role not in ('pending', 'member', 'admin') then
    v_role := 'pending';
  end if;
  insert into public.profiles (id, name, email, avatar, avatar_color, role)
  values (
    new.id,
    v_name,
    lower(new.email),
    upper(left(regexp_replace(v_name, '[^[:alnum:] ]', '', 'g'), 2)),
    '#6366f1',
    v_role
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuários do Auth sem perfil (contas antigas): entram como pendentes
insert into public.profiles (id, name, email, avatar, avatar_color, role)
select u.id,
       coalesce(nullif(u.raw_user_meta_data ->> 'name', ''), split_part(u.email, '@', 1)),
       lower(u.email),
       upper(left(coalesce(nullif(u.raw_user_meta_data ->> 'name', ''), u.email), 2)),
       '#6366f1',
       'pending'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- Usuário comum não pode promover a si mesmo nem trocar o e-mail do perfil
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Somente administradores podem alterar o papel do usuário';
    end if;
    if new.email is distinct from old.email then
      raise exception 'O e-mail do perfil só pode ser alterado por um administrador';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ─── 2. Colunas novas e limpeza de legado ────────────────────
-- profile_id era o id dos perfis mock ('MA'); o dono real passa a ser user_id
alter table public.tasks alter column profile_id drop not null, alter column profile_id drop default;
alter table public.meetings alter column profile_id drop not null, alter column profile_id drop default;
alter table public.activity_events alter column profile_id drop not null, alter column profile_id drop default;
alter table public.projects alter column profile_id drop not null, alter column profile_id drop default;
alter table public.custom_tags alter column profile_id drop not null, alter column profile_id drop default;

alter table public.tasks alter column user_id set default auth.uid();
alter table public.meetings alter column user_id set default auth.uid();
alter table public.activity_events alter column user_id set default auth.uid();
alter table public.projects alter column user_id set default auth.uid();
alter table public.custom_tags alter column user_id set default auth.uid();

-- Integração Obsidian / Hermes
alter table public.tasks add column if not exists external_ref text;       -- ID do chamado ITSM (ex: 12345)
alter table public.tasks add column if not exists source text not null default 'octho';
alter table public.tasks add column if not exists vault_path text;         -- ex: Chamados/12345 Descricao do chamado.md
alter table public.tasks add column if not exists completed_at timestamptz;
alter table public.tasks add column if not exists updated_at timestamptz not null default now();

alter table public.meetings add column if not exists granola_id text;
alter table public.meetings add column if not exists external_ref text;    -- chamado vinculado
alter table public.meetings add column if not exists vault_path text;      -- ex: Meetings/2026-11-05 12345 Tema da reuniao.md
alter table public.meetings add column if not exists source text not null default 'octho';
alter table public.meetings add column if not exists updated_at timestamptz not null default now();

alter table public.projects add column if not exists updated_at timestamptz not null default now();

create unique index if not exists uq_tasks_external_ref on public.tasks (external_ref) where external_ref is not null;
create unique index if not exists uq_meetings_granola_id on public.meetings (granola_id) where granola_id is not null;
create index if not exists idx_tasks_updated on public.tasks (updated_at);
create index if not exists idx_meetings_updated on public.meetings (updated_at);

update public.tasks set completed_at = coalesce(completed_at, created_at) where "column" = 'done';

-- Clientes (antes só no localStorage)
create table if not exists public.clients (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_clients_name on public.clients (lower(name));

-- Registro de horas com data (fonte única das horas)
create table if not exists public.time_entries (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id text references public.tasks(id) on delete set null,
  meeting_id text references public.meetings(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  hours numeric(6, 2) not null check (hours > 0 and hours <= 24),
  source text not null default 'manual' check (source in ('timer', 'meeting', 'manual', 'agent')),
  note text,
  external_id text,                       -- id idempotente vindo do Hermes / vault
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_time_entries_external_id on public.time_entries (external_id) where external_id is not null;
create index if not exists idx_time_entries_user_started on public.time_entries (user_id, started_at);
create index if not exists idx_time_entries_task on public.time_entries (task_id);
create index if not exists idx_time_entries_updated on public.time_entries (updated_at);

-- Saldo anterior: cada tarefa com horas e sem lançamentos ganha um lançamento único
insert into public.time_entries (user_id, task_id, started_at, hours, source, note)
select t.user_id, t.id, t.created_at, round(t.hours_logged::numeric, 2), 'manual', 'Saldo anterior à migração'
from public.tasks t
where t.hours_logged > 0
  and t.hours_logged <= 24
  and t.user_id is not null
  and not exists (select 1 from public.time_entries e where e.task_id = t.id);

-- tasks.hours_logged passa a ser derivado de time_entries
create or replace function public.sync_task_hours()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old text;
  v_new text;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_old := old.task_id; end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := new.task_id; end if;

  if v_old is not null then
    update public.tasks
       set hours_logged = coalesce((select sum(hours) from public.time_entries where task_id = v_old), 0)
     where id = v_old;
  end if;
  if v_new is not null and v_new is distinct from v_old then
    update public.tasks
       set hours_logged = coalesce((select sum(hours) from public.time_entries where task_id = v_new), 0)
     where id = v_new;
  end if;
  return null;
end $$;

drop trigger if exists time_entries_sync_task_hours on public.time_entries;
create trigger time_entries_sync_task_hours
  after insert or update or delete on public.time_entries
  for each row execute function public.sync_task_hours();

-- updated_at automático (usado pelo export incremental do Hermes)
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['tasks', 'meetings', 'projects', 'time_entries'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format(
      'create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ─── 3. RLS ──────────────────────────────────────────────────
alter table public.clients enable row level security;
alter table public.time_entries enable row level security;

drop policy if exists "Acesso livre a perfis" on public.profiles;
drop policy if exists "Acesso livre a tarefas" on public.tasks;
drop policy if exists "Acesso livre a atividades" on public.activity_events;
drop policy if exists "Acesso livre a projetos" on public.projects;
drop policy if exists "Acesso livre a reuniões" on public.meetings;
drop policy if exists "Acesso livre a tags" on public.custom_tags;

do $$
declare
  r record;
begin
  -- remove políticas criadas por execuções anteriores desta migração
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and policyname like 'octho_%'
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles: equipe vê a equipe; cada um edita o próprio; admin edita todos
create policy octho_profiles_select on public.profiles for select to authenticated
  using (public.is_member() or id = auth.uid());
create policy octho_profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy octho_profiles_delete on public.profiles for delete to authenticated
  using (public.is_admin());

-- tasks: quadro compartilhado da equipe
create policy octho_tasks_select on public.tasks for select to authenticated using (public.is_member());
create policy octho_tasks_insert on public.tasks for insert to authenticated
  with check (public.is_member() and user_id = auth.uid());
create policy octho_tasks_update on public.tasks for update to authenticated
  using (public.is_member()) with check (public.is_member());
create policy octho_tasks_delete on public.tasks for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- time_entries: equipe lê (relatórios); cada um mantém os próprios
create policy octho_time_select on public.time_entries for select to authenticated using (public.is_member());
create policy octho_time_insert on public.time_entries for insert to authenticated
  with check (public.is_member() and user_id = auth.uid());
create policy octho_time_update on public.time_entries for update to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy octho_time_delete on public.time_entries for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- meetings: pessoais
create policy octho_meetings_select on public.meetings for select to authenticated
  using (public.is_member() and (user_id = auth.uid() or public.is_admin()));
create policy octho_meetings_insert on public.meetings for insert to authenticated
  with check (public.is_member() and user_id = auth.uid());
create policy octho_meetings_update on public.meetings for update to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy octho_meetings_delete on public.meetings for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- activity_events: feed da equipe, só inserção do próprio usuário
create policy octho_events_select on public.activity_events for select to authenticated using (public.is_member());
create policy octho_events_insert on public.activity_events for insert to authenticated
  with check (public.is_member() and user_id = auth.uid());
create policy octho_events_delete on public.activity_events for delete to authenticated using (public.is_admin());

-- projects: compartilhados
create policy octho_projects_select on public.projects for select to authenticated using (public.is_member());
create policy octho_projects_insert on public.projects for insert to authenticated
  with check (public.is_member() and user_id = auth.uid());
create policy octho_projects_update on public.projects for update to authenticated
  using (public.is_member()) with check (public.is_member());
create policy octho_projects_delete on public.projects for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- custom_tags e clients: catálogos da equipe
create policy octho_tags_select on public.custom_tags for select to authenticated using (public.is_member());
create policy octho_tags_insert on public.custom_tags for insert to authenticated with check (public.is_member());
create policy octho_tags_update on public.custom_tags for update to authenticated
  using (public.is_member()) with check (public.is_member());
create policy octho_tags_delete on public.custom_tags for delete to authenticated using (public.is_member());

create policy octho_clients_select on public.clients for select to authenticated using (public.is_member());
create policy octho_clients_insert on public.clients for insert to authenticated with check (public.is_member());
create policy octho_clients_update on public.clients for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy octho_clients_delete on public.clients for delete to authenticated using (public.is_admin());

-- Defesa em profundidade: a chave pública anônima não acessa nenhuma tabela do Octho
revoke all on public.profiles, public.tasks, public.meetings, public.activity_events,
  public.projects, public.custom_tags, public.clients, public.time_entries from anon;
