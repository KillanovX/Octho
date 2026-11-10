-- =============================================================
-- Octho — Endurecimento (advisors do Supabase, 2026-11-10)
-- 1. Funções SECURITY DEFINER saem do schema exposto pela API (public -> private)
-- 2. Funções de trigger sem EXECUTE para anon/authenticated
-- 3. search_path fixo em touch_updated_at
-- 4. Políticas com (select auth.uid()) (avaliado uma vez por consulta)
-- 5. Índices nas chaves estrangeiras sem cobertura
-- Idempotente.
-- =============================================================

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role in ('member', 'admin')
  );
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

revoke all on function private.is_member(), private.is_admin() from public, anon;
grant execute on function private.is_member(), private.is_admin() to authenticated;

create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not private.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Somente administradores podem alterar o papel do usuário';
    end if;
    if new.email is distinct from old.email then
      raise exception 'O e-mail do perfil só pode ser alterado por um administrador';
    end if;
  end if;
  return new;
end $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Funções de trigger não precisam de EXECUTE para disparar; bloqueia chamada via /rpc
revoke all on function public.handle_new_user(), public.protect_profile_fields(),
  public.sync_task_hours(), public.touch_updated_at() from public, anon, authenticated;

-- Recria as políticas apontando para private.* e com (select auth.uid())
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and policyname like 'octho_%'
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy octho_profiles_select on public.profiles for select to authenticated
  using (private.is_member() or id = (select auth.uid()));
create policy octho_profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or private.is_admin()) with check (id = (select auth.uid()) or private.is_admin());
create policy octho_profiles_delete on public.profiles for delete to authenticated
  using (private.is_admin());

create policy octho_tasks_select on public.tasks for select to authenticated using (private.is_member());
create policy octho_tasks_insert on public.tasks for insert to authenticated
  with check (private.is_member() and user_id = (select auth.uid()));
create policy octho_tasks_update on public.tasks for update to authenticated
  using (private.is_member()) with check (private.is_member());
create policy octho_tasks_delete on public.tasks for delete to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

create policy octho_time_select on public.time_entries for select to authenticated using (private.is_member());
create policy octho_time_insert on public.time_entries for insert to authenticated
  with check (private.is_member() and user_id = (select auth.uid()));
create policy octho_time_update on public.time_entries for update to authenticated
  using (user_id = (select auth.uid()) or private.is_admin()) with check (user_id = (select auth.uid()) or private.is_admin());
create policy octho_time_delete on public.time_entries for delete to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

create policy octho_meetings_select on public.meetings for select to authenticated
  using (private.is_member() and (user_id = (select auth.uid()) or private.is_admin()));
create policy octho_meetings_insert on public.meetings for insert to authenticated
  with check (private.is_member() and user_id = (select auth.uid()));
create policy octho_meetings_update on public.meetings for update to authenticated
  using (user_id = (select auth.uid()) or private.is_admin()) with check (user_id = (select auth.uid()) or private.is_admin());
create policy octho_meetings_delete on public.meetings for delete to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

create policy octho_events_select on public.activity_events for select to authenticated using (private.is_member());
create policy octho_events_insert on public.activity_events for insert to authenticated
  with check (private.is_member() and user_id = (select auth.uid()));
create policy octho_events_delete on public.activity_events for delete to authenticated using (private.is_admin());

create policy octho_projects_select on public.projects for select to authenticated using (private.is_member());
create policy octho_projects_insert on public.projects for insert to authenticated
  with check (private.is_member() and user_id = (select auth.uid()));
create policy octho_projects_update on public.projects for update to authenticated
  using (private.is_member()) with check (private.is_member());
create policy octho_projects_delete on public.projects for delete to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

create policy octho_tags_select on public.custom_tags for select to authenticated using (private.is_member());
create policy octho_tags_insert on public.custom_tags for insert to authenticated with check (private.is_member());
create policy octho_tags_update on public.custom_tags for update to authenticated
  using (private.is_member()) with check (private.is_member());
create policy octho_tags_delete on public.custom_tags for delete to authenticated using (private.is_member());

create policy octho_clients_select on public.clients for select to authenticated using (private.is_member());
create policy octho_clients_insert on public.clients for insert to authenticated with check (private.is_member());
create policy octho_clients_update on public.clients for update to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy octho_clients_delete on public.clients for delete to authenticated using (private.is_admin());

-- Versões antigas no schema exposto deixam de existir
drop function if exists public.is_member();
drop function if exists public.is_admin();

create index if not exists idx_clients_created_by on public.clients (created_by);
create index if not exists idx_time_entries_meeting on public.time_entries (meeting_id);
