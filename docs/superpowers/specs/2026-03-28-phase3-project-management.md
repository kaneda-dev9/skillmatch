# Phase 3: 案件管理 設計書

## 概要

案件情報の CRUD 操作、ステータス管理、Embedding 生成によるベクトル検索基盤を構築する。Phase 2（エンジニア管理）と同じアーキテクチャパターンを踏襲する。

## スコープ

- 案件一覧画面（検索・フィルタ・ソート）
- 案件登録（フォーム入力のみ。ファイルアップロードは後日追加）
- 案件詳細画面 + ステータス切替
- 案件編集・削除
- OpenAI Embedding 生成 + pgvector 保存

## 画面構成

### 案件一覧（`/projects`）

- テーブル形式で一覧表示
- **テキスト検索**: タイトル・クライアント名で部分一致
- **フィルタ**:
  - ステータス（open / closed）
  - 業界（複数選択）
- **ソート**: タイトル（昇順/降順）、登録日（新しい順/古い順）
- 各行クリックで詳細画面へ

### 案件登録（`/projects/new`）

- フォーム入力のみ（ファイルアップロードは将来追加）

#### フォームフィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| タイトル | text | ○ | 案件名 |
| クライアント名 | text | ○ | 企業名 |
| 要求スキル | 配列 | ○ | スキル名 + レベル + 経験年数（動的追加） |
| 必要経験年数 | number | ○ | |
| 業界 | 配列 | - | タグ入力 |
| 稼働条件 | object | - | 単価（min/max）、稼働開始日、リモート可否、勤務地 |
| 案件説明 | textarea | - | 自由記述 |
| ステータス | select | ○ | open / closed（デフォルト: open） |

### 案件詳細（`/projects/[id]`）

- 要求スキル（バッジ表示）、条件、説明文を表示
- **ステータス切替ボタン**: open ↔ closed をワンクリックで切替
- アクションボタン: 編集、削除

### 案件編集（`/projects/[id]/edit`）

- 登録と同じフォーム（既存データがプリフィル済み）
- 保存時に Embedding を再生成

## データモデル

### projects テーブル（既存）

```sql
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

RLS ポリシー、FK インデックスは Phase 1 + 002 マイグレーションで適用済み。

## Server Actions

### `createProject(formData: FormData)`
- 認証チェック + org_id 取得
- `projectFormSchema` でバリデーション
- projects テーブルに INSERT
- Embedding 生成（失敗しても保存は続行）
- revalidatePath + redirect

### `updateProject(id: string, formData: FormData)`
- projects テーブルを UPDATE
- Embedding 再生成
- revalidatePath + redirect

### `deleteProject(id: string)`
- projects テーブルから DELETE
- revalidatePath + redirect

### `toggleProjectStatus(id: string)`
- 現在のステータスを取得 → 反転（open ↔ closed）
- revalidatePath

## Zod バリデーションスキーマ

### 共通スキーマの切り出し

`skillSchema` と `availabilitySchema` はエンジニアと案件で共有する。`src/lib/validations/shared.ts` に切り出す。

```typescript
// src/lib/validations/shared.ts
export const skillSchema = z.object({
  name: z.string().min(1),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  years: z.number().min(0),
})

export const availabilitySchema = z.object({
  rate_min: z.number().nullable().default(null),
  rate_max: z.number().nullable().default(null),
  start_date: z.string().nullable().default(null),
  remote: z.boolean().default(false),
  location: z.string().nullable().default(null),
})
```

### projectFormSchema

```typescript
export const projectFormSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  client_name: z.string().min(1, "クライアント名は必須です"),
  required_skills: z.array(skillSchema).default([]),
  experience_years: z.number().min(0).default(0),
  industries: z.array(z.string()).default([]),
  conditions: availabilitySchema.default({}),
  description: z.string().default(""),
  status: z.enum(["open", "closed"]).default("open"),
})
```

## Embedding 生成

`src/lib/ai/embedding.ts` に `buildProjectEmbeddingText` を追加。

```typescript
export function buildProjectEmbeddingText(project: ProjectEmbeddingInput): string {
  // タイトル + クライアント + スキル + 業界 + 説明 からテキスト生成
}
```

## ディレクトリ構成

```
src/
├── app/(dashboard)/
│   └── projects/
│       ├── page.tsx                    ← 一覧（Server Component）
│       ├── new/
│       │   └── page.tsx               ← 新規登録
│       ├── [id]/
│       │   ├── page.tsx               ← 詳細
│       │   └── edit/
│       │       └── page.tsx           ← 編集
│       ├── loading.tsx                ← スケルトン
│       └── _components/
│           ├── project-table.tsx       ← 一覧テーブル
│           ├── project-form.tsx        ← 登録・編集フォーム
│           ├── project-detail.tsx      ← 詳細表示
│           └── search-filter.tsx       ← 検索・フィルタ
├── actions/
│   └── projects.ts                    ← Server Actions
└── lib/
    └── validations/
        ├── shared.ts                  ← 共通スキーマ（skill, availability）
        ├── engineer.ts                ← 既存（shared.ts からインポートに変更）
        └── project.ts                ← 案件用スキーマ
```

## エラーハンドリング

| シーン | 対応 |
|--------|------|
| Embedding 生成失敗 | 案件情報は保存、Embedding は null のまま |
| バリデーションエラー | フォームにエラーメッセージ表示 |
| DB エラー | エラーメッセージ返却 |
