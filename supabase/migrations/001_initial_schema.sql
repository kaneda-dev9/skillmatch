-- pgvector 拡張を有効化
create extension if not exists vector with schema extensions;

-- organizations テーブル
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text,
  created_at timestamptz not null default now()
);

-- users テーブル
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

-- engineers テーブル
create table public.engineers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  skills jsonb not null default '[]'::jsonb,
  experience_years int not null default 0,
  industries text[] not null default '{}',
  availability jsonb not null default '{}'::jsonb,
  soft_skills jsonb not null default '[]'::jsonb,
  raw_text text not null default '',
  embedding extensions.vector(1536),
  created_at timestamptz not null default now()
);

-- projects テーブル
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  client_name text not null,
  required_skills jsonb not null default '[]'::jsonb,
  experience_years int not null default 0,
  industries text[] not null default '{}',
  conditions jsonb not null default '{}'::jsonb,
  description text not null default '',
  embedding extensions.vector(1536),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

-- matches テーブル
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  engineer_id uuid not null references public.engineers(id) on delete cascade,
  overall_score float not null default 0,
  skill_score float not null default 0,
  experience_score float not null default 0,
  industry_score float not null default 0,
  condition_score float not null default 0,
  soft_skill_score float not null default 0,
  ai_reasoning text not null default '',
  created_at timestamptz not null default now()
);

-- documents テーブル
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engineer_id uuid references public.engineers(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  parsed_content text,
  created_at timestamptz not null default now()
);

-- proposals テーブル
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  content text not null,
  format text not null default 'markdown',
  created_at timestamptz not null default now()
);

-- ベクトル検索用インデックス
create index engineers_embedding_idx on public.engineers
  using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 100);

create index projects_embedding_idx on public.projects
  using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 100);

-- RLS を有効化
alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.engineers enable row level security;
alter table public.projects enable row level security;
alter table public.matches enable row level security;
alter table public.documents enable row level security;
alter table public.proposals enable row level security;

-- ユーザーの org_id を取得するヘルパー関数
create or replace function public.get_user_org_id()
returns uuid
language sql
stable
security definer
as $$
  select org_id from public.users where id = auth.uid()
$$;

-- RLS ポリシー: organizations
create policy "ユーザーは自分の組織のみ参照可能"
  on public.organizations for select
  using (id = public.get_user_org_id());

-- RLS ポリシー: users
create policy "ユーザーは自組織のメンバーのみ参照可能"
  on public.users for select
  using (org_id = public.get_user_org_id());

create policy "管理者は自組織にメンバーを追加可能"
  on public.users for insert
  with check (
    org_id = public.get_user_org_id()
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS ポリシー: engineers
create policy "自組織のエンジニアのみ参照可能"
  on public.engineers for select
  using (org_id = public.get_user_org_id());

create policy "自組織にエンジニアを追加可能"
  on public.engineers for insert
  with check (org_id = public.get_user_org_id());

create policy "自組織のエンジニアを更新可能"
  on public.engineers for update
  using (org_id = public.get_user_org_id());

create policy "自組織のエンジニアを削除可能"
  on public.engineers for delete
  using (org_id = public.get_user_org_id());

-- RLS ポリシー: projects
create policy "自組織の案件のみ参照可能"
  on public.projects for select
  using (org_id = public.get_user_org_id());

create policy "自組織に案件を追加可能"
  on public.projects for insert
  with check (org_id = public.get_user_org_id());

create policy "自組織の案件を更新可能"
  on public.projects for update
  using (org_id = public.get_user_org_id());

create policy "自組織の案件を削除可能"
  on public.projects for delete
  using (org_id = public.get_user_org_id());

-- RLS ポリシー: matches
create policy "自組織のマッチ結果のみ参照可能"
  on public.matches for select
  using (org_id = public.get_user_org_id());

create policy "自組織にマッチ結果を追加可能"
  on public.matches for insert
  with check (org_id = public.get_user_org_id());

-- RLS ポリシー: documents
create policy "自組織のドキュメントのみ参照可能"
  on public.documents for select
  using (org_id = public.get_user_org_id());

create policy "自組織にドキュメントを追加可能"
  on public.documents for insert
  with check (org_id = public.get_user_org_id());

create policy "自組織のドキュメントを削除可能"
  on public.documents for delete
  using (org_id = public.get_user_org_id());

-- RLS ポリシー: proposals
create policy "自組織の提案書のみ参照可能"
  on public.proposals for select
  using (org_id = public.get_user_org_id());

create policy "自組織に提案書を追加可能"
  on public.proposals for insert
  with check (org_id = public.get_user_org_id());

create policy "自組織の提案書を更新可能"
  on public.proposals for update
  using (org_id = public.get_user_org_id());

create policy "自組織の提案書を削除可能"
  on public.proposals for delete
  using (org_id = public.get_user_org_id());
