-- =============================================================
-- Octho — Ordem persistida no Kanban e Realtime (2026-11-10)
-- Idempotente.
-- =============================================================

-- Ordem dos cards dentro da coluna (fracionária: inserir entre dois cards não reordena os demais)
alter table public.tasks add column if not exists position double precision;
update public.tasks set position = extract(epoch from created_at) where position is null;
alter table public.tasks alter column position set default extract(epoch from now());
alter table public.tasks alter column position set not null;
create index if not exists idx_tasks_column_position on public.tasks ("column", position);

-- Realtime: alterações de tarefas, horas, reuniões e feed chegam aos clientes conectados.
-- O Realtime respeita as políticas RLS de cada usuário.
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['tasks', 'time_entries', 'meetings', 'activity_events'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
