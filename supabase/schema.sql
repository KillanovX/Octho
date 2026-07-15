-- =============================================================
-- Fluxo — Schema do Banco de Dados (Supabase / PostgreSQL)
-- =============================================================

-- Tabela de tarefas
create table if not exists tasks (
  id text primary key default gen_random_uuid()::text,
  profile_id text not null,             -- "MA" ou "FA"
  code text not null,
  title text not null,
  "column" text not null default 'backlog',
  priority text not null default 'none',
  labels jsonb not null default '[]',
  assignee text not null default '',
  assignee_color text not null default '#888',
  hours_logged real not null default 0,
  estimate real not null default 0,
  created_at timestamptz not null default now()
);

-- Tabela de eventos de atividade
create table if not exists activity_events (
  id text primary key default gen_random_uuid()::text,
  profile_id text not null,             -- "MA" ou "FA"
  user_initials text not null,
  user_color text not null,
  action text not null,
  target text not null,
  created_at timestamptz not null default now()
);

-- Índices para consultas por profile_id
create index if not exists idx_tasks_profile on tasks (profile_id);
create index if not exists idx_events_profile on activity_events (profile_id);

-- Desabilitar RLS (app sem autenticação por enquanto)
alter table tasks enable row level security;
alter table activity_events enable row level security;

-- Políticas abertas (acessível via anon key sem auth)
create policy "Allow all on tasks" on tasks for all using (true) with check (true);
create policy "Allow all on activity_events" on activity_events for all using (true) with check (true);
