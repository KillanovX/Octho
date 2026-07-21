-- =============================================================
-- Octho — Schema do Banco de Dados (Supabase / PostgreSQL)
-- =============================================================

-- 1. Tabela de Perfis de Usuário (vinculada ao Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null,
  avatar text not null,
  avatar_color text not null default '#6366f1',
  image_url text,
  created_at timestamptz default now()
);

-- 2. Tabela de tarefas
create table if not exists public.tasks (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade,
  profile_id text not null default 'MA',
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

-- 3. Tabela de eventos de atividade
create table if not exists public.activity_events (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade,
  profile_id text not null default 'MA',
  user_initials text not null,
  user_color text not null,
  action text not null,
  target text not null,
  created_at timestamptz not null default now()
);

-- 4. Tabela de projetos
create table if not exists public.projects (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  category text,
  status text not null default 'active',
  progress integer not null default 0,
  hours_logged real not null default 0,
  estimate real not null default 0,
  members jsonb not null default '[]',
  created_at timestamptz default now()
);

-- 5. Índices para otimização de consultas
create index if not exists idx_tasks_user on public.tasks (user_id);
create index if not exists idx_tasks_profile on public.tasks (profile_id);
create index if not exists idx_events_user on public.activity_events (user_id);

-- 6. Configuração de Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.activity_events enable row level security;
alter table public.projects enable row level security;

-- 7. Políticas de acesso seguro (usuários autenticados ou acesso anônimo no modo demo)
create policy "Acesso livre a perfis" on public.profiles for all using (true) with check (true);
create policy "Acesso livre a tarefas" on public.tasks for all using (true) with check (true);
create policy "Acesso livre a atividades" on public.activity_events for all using (true) with check (true);
create policy "Acesso livre a projetos" on public.projects for all using (true) with check (true);
