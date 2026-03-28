-- ============================================================
-- 002: パフォーマンス改善 + スキーマ強化
-- ============================================================

-- moddatetime 拡張（updated_at 自動更新用）
create extension if not exists moddatetime with schema extensions;

-- ============================================================
-- 1. updated_at カラムを全テーブルに追加
-- ============================================================

alter table public.organizations add column if not exists updated_at timestamptz not null default now();
alter table public.users add column if not exists updated_at timestamptz not null default now();
alter table public.engineers add column if not exists updated_at timestamptz not null default now();
alter table public.projects add column if not exists updated_at timestamptz not null default now();
alter table public.matches add column if not exists updated_at timestamptz not null default now();
alter table public.documents add column if not exists updated_at timestamptz not null default now();
alter table public.proposals add column if not exists updated_at timestamptz not null default now();

-- updated_at 自動更新トリガー
create trigger set_updated_at before update on public.organizations for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.users for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.engineers for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.projects for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.matches for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.documents for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.proposals for each row execute function extensions.moddatetime(updated_at);

-- ============================================================
-- 2. FK 列のインデックス追加（RLS + CASCADE 性能改善）
-- ============================================================

create index if not exists users_org_id_idx on public.users (org_id);
create index if not exists engineers_org_id_idx on public.engineers (org_id);
create index if not exists projects_org_id_idx on public.projects (org_id);
create index if not exists matches_org_id_idx on public.matches (org_id);
create index if not exists matches_project_id_idx on public.matches (project_id);
create index if not exists matches_engineer_id_idx on public.matches (engineer_id);
create index if not exists documents_org_id_idx on public.documents (org_id);
create index if not exists documents_engineer_id_idx on public.documents (engineer_id);
create index if not exists documents_project_id_idx on public.documents (project_id);
create index if not exists proposals_org_id_idx on public.proposals (org_id);
create index if not exists proposals_match_id_idx on public.proposals (match_id);

-- ============================================================
-- 3. unique インデックス（重複データ防止）
-- ============================================================

create unique index if not exists users_org_id_email_idx on public.users (org_id, email);
create unique index if not exists matches_project_engineer_idx on public.matches (project_id, engineer_id);

-- ============================================================
-- 4. RLS ポリシーの最適化（select ラップでキャッシュ）
-- ============================================================

-- get_user_org_id を再作成（変更なし、念のため）
create or replace function public.get_user_org_id()
returns uuid
language sql
stable
security definer
as $$
  select org_id from public.users where id = (select auth.uid())
$$;

-- 既存ポリシーを削除して最適化版を再作成

-- organizations
drop policy if exists "ユーザーは自分の組織のみ参照可能" on public.organizations;
create policy "ユーザーは自分の組織のみ参照可能"
  on public.organizations for select
  using (id = (select public.get_user_org_id()));

-- users
drop policy if exists "ユーザーは自組織のメンバーのみ参照可能" on public.users;
create policy "ユーザーは自組織のメンバーのみ参照可能"
  on public.users for select
  using (org_id = (select public.get_user_org_id()));

drop policy if exists "管理者は自組織にメンバーを追加可能" on public.users;
create policy "管理者は自組織にメンバーを追加可能"
  on public.users for insert
  with check (
    org_id = (select public.get_user_org_id())
    and exists (
      select 1 from public.users
      where id = (select auth.uid()) and role = 'admin'
    )
  );

-- engineers
drop policy if exists "自組織のエンジニアのみ参照可能" on public.engineers;
create policy "自組織のエンジニアのみ参照可能"
  on public.engineers for select
  using (org_id = (select public.get_user_org_id()));

drop policy if exists "自組織にエンジニアを追加可能" on public.engineers;
create policy "自組織にエンジニアを追加可能"
  on public.engineers for insert
  with check (org_id = (select public.get_user_org_id()));

drop policy if exists "自組織のエンジニアを更新可能" on public.engineers;
create policy "自組織のエンジニアを更新可能"
  on public.engineers for update
  using (org_id = (select public.get_user_org_id()));

drop policy if exists "自組織のエンジニアを削除可能" on public.engineers;
create policy "自組織のエンジニアを削除可能"
  on public.engineers for delete
  using (org_id = (select public.get_user_org_id()));

-- projects
drop policy if exists "自組織の案件のみ参照可能" on public.projects;
create policy "自組織の案件のみ参照可能"
  on public.projects for select
  using (org_id = (select public.get_user_org_id()));

drop policy if exists "自組織に案件を追加可能" on public.projects;
create policy "自組織に案件を追加可能"
  on public.projects for insert
  with check (org_id = (select public.get_user_org_id()));

drop policy if exists "自組織の案件を更新可能" on public.projects;
create policy "自組織の案件を更新可能"
  on public.projects for update
  using (org_id = (select public.get_user_org_id()));

drop policy if exists "自組織の案件を削除可能" on public.projects;
create policy "自組織の案件を削除可能"
  on public.projects for delete
  using (org_id = (select public.get_user_org_id()));

-- matches
drop policy if exists "自組織のマッチ結果のみ参照可能" on public.matches;
create policy "自組織のマッチ結果のみ参照可能"
  on public.matches for select
  using (org_id = (select public.get_user_org_id()));

drop policy if exists "自組織にマッチ結果を追加可能" on public.matches;
create policy "自組織にマッチ結果を追加可能"
  on public.matches for insert
  with check (org_id = (select public.get_user_org_id()));

-- documents
drop policy if exists "自組織のドキュメントのみ参照可能" on public.documents;
create policy "自組織のドキュメントのみ参照可能"
  on public.documents for select
  using (org_id = (select public.get_user_org_id()));

drop policy if exists "自組織にドキュメントを追加可能" on public.documents;
create policy "自組織にドキュメントを追加可能"
  on public.documents for insert
  with check (org_id = (select public.get_user_org_id()));

drop policy if exists "自組織のドキュメントを削除可能" on public.documents;
create policy "自組織のドキュメントを削除可能"
  on public.documents for delete
  using (org_id = (select public.get_user_org_id()));

-- proposals
drop policy if exists "自組織の提案書のみ参照可能" on public.proposals;
create policy "自組織の提案書のみ参照可能"
  on public.proposals for select
  using (org_id = (select public.get_user_org_id()));

drop policy if exists "自組織に提案書を追加可能" on public.proposals;
create policy "自組織に提案書を追加可能"
  on public.proposals for insert
  with check (org_id = (select public.get_user_org_id()));

drop policy if exists "自組織の提案書を更新可能" on public.proposals;
create policy "自組織の提案書を更新可能"
  on public.proposals for update
  using (org_id = (select public.get_user_org_id()));

drop policy if exists "自組織の提案書を削除可能" on public.proposals;
create policy "自組織の提案書を削除可能"
  on public.proposals for delete
  using (org_id = (select public.get_user_org_id()));
