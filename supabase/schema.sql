-- 測試案例管理工具 資料庫結構 (貼到 Supabase 的 SQL Editor 執行一次即可)

create extension if not exists pgcrypto;

-- ===== 資料表 =====
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_at timestamptz not null default now()
);

create table team_members (
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  parent_id uuid references folders(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table test_cases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  folder_id uuid references folders(id) on delete cascade,
  title text not null,
  preconditions text not null default '',
  steps text not null default '',
  expected_result text not null default '',
  priority text not null default '中' check (priority in ('高', '中', '低')),
  type text not null default '功能測試' check (type in ('功能測試', '整合測試', '壓力測試', '其他')),
  created_at timestamptz not null default now()
);

create table test_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table plan_cases (
  plan_id uuid not null references test_plans(id) on delete cascade,
  case_id uuid not null references test_cases(id) on delete cascade,
  status text not null default '未測試' check (status in ('未測試', '已通過', '待複測')),
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (plan_id, case_id)
);

create index on folders(project_id);
create index on test_cases(project_id);
create index on test_plans(project_id);

-- ===== 權限判斷函式 =====
create function is_team_member(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_members where team_id = tid and user_id = auth.uid());
$$;

create function can_access_project(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from projects p
    join team_members m on m.team_id = p.team_id
    where p.id = pid and m.user_id = auth.uid()
  );
$$;

create function can_access_plan(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from test_plans t where t.id = pid and can_access_project(t.project_id));
$$;

-- ===== 建立/加入團隊 =====
create function create_team(team_name text) returns teams
language plpgsql security definer set search_path = public as $$
declare t teams;
begin
  if auth.uid() is null then raise exception '請先登入'; end if;
  insert into teams(name) values (team_name) returning * into t;
  insert into team_members(team_id, user_id) values (t.id, auth.uid());
  return t;
end $$;

create function join_team(code text) returns teams
language plpgsql security definer set search_path = public as $$
declare t teams;
begin
  if auth.uid() is null then raise exception '請先登入'; end if;
  select * into t from teams where invite_code = upper(trim(code));
  if not found then raise exception '邀請碼不正確'; end if;
  insert into team_members(team_id, user_id) values (t.id, auth.uid()) on conflict do nothing;
  return t;
end $$;

-- ===== Row Level Security =====
alter table teams enable row level security;
alter table team_members enable row level security;
alter table projects enable row level security;
alter table folders enable row level security;
alter table test_cases enable row level security;
alter table test_plans enable row level security;
alter table plan_cases enable row level security;

create policy "成員可看團隊" on teams for select using (is_team_member(id));
create policy "成員可改團隊" on teams for update using (is_team_member(id));
create policy "看自己的成員資料" on team_members for select using (user_id = auth.uid());

create policy "專案存取" on projects for all
  using (is_team_member(team_id)) with check (is_team_member(team_id));
create policy "資料夾存取" on folders for all
  using (can_access_project(project_id)) with check (can_access_project(project_id));
create policy "案例存取" on test_cases for all
  using (can_access_project(project_id)) with check (can_access_project(project_id));
create policy "計畫存取" on test_plans for all
  using (can_access_project(project_id)) with check (can_access_project(project_id));
create policy "計畫案例存取" on plan_cases for all
  using (can_access_plan(plan_id)) with check (can_access_plan(plan_id));

grant execute on function create_team(text), join_team(text) to authenticated;
