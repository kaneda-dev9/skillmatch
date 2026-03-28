# Phase 2: エンジニア管理 設計書

## 概要

エンジニア情報の CRUD 操作、PDF/Word/Excel からの自動構造化、Embedding 生成によるベクトル検索基盤を構築する。

## スコープ

- エンジニア一覧画面（検索・フィルタ・ソート）
- エンジニア登録（フォーム手入力 + ファイルアップロード → 即時解析 → 確認後保存）
- エンジニア詳細画面（構造化情報 / 原文テキスト / ファイルプレビュー）
- エンジニア編集・削除・再アップロード
- OpenAI Embedding 生成 + pgvector 保存

## アーキテクチャ

```
ユーザー操作
├── エンジニア一覧（検索・フィルタ・ソート）
├── エンジニア登録
│   ├── フォーム手入力
│   └── ファイルアップロード（PDF/Word/Excel）
│       → Supabase Storage
│       → Claude で構造化（AI SDK generateText + Output.object）
│       → フォームにプリフィル
│       → ユーザー確認・修正
│       → 保存（engineers + documents テーブル）
│       → OpenAI Embedding 生成 → pgvector 保存
├── エンジニア詳細（タブ切替: 構造化情報 / 原文 / ファイルプレビュー）
└── エンジニア編集・削除・再アップロード
```

## 画面構成

### エンジニア一覧（`/engineers`）

- テーブル形式で一覧表示
- **テキスト検索**: 名前・スキル名で部分一致検索
- **フィルタ**:
  - スキル（複数選択）
  - 業界（複数選択）
  - 稼働条件（リモート可否、単価範囲）
- **ソート**: 名前（昇順/降順）、登録日（新しい順/古い順）
- 各行にクリックで詳細画面へ遷移

### エンジニア登録（`/engineers/new`）

- 2つの入力方式を切り替え可能:
  - **フォーム入力**: 各フィールドを手動入力
  - **ファイルアップロード**: PDF/Word/Excel をアップロード → Claude で即時解析 → フォームにプリフィル
- アップロード時の UX:
  1. ファイルドロップ or 選択
  2. ローディング表示（「スキルシートを解析中...」）
  3. 解析完了 → フォームに自動入力
  4. ユーザーが確認・修正
  5. 「保存」ボタンで確定

#### フォームフィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| 名前 | text | ○ | エンジニア名 |
| メール | email | - | 連絡先 |
| スキル | 配列 | ○ | スキル名 + レベル + 経験年数（動的追加） |
| 総経験年数 | number | ○ | IT業界での経験年数 |
| 業界経験 | 配列 | - | 金融、医療、EC など（タグ入力） |
| 稼働条件 | object | - | 単価（min/max）、稼働開始日、リモート可否、勤務地 |
| ソフトスキル | 配列 | - | リーダー経験、コミュニケーション等（動的追加） |

### エンジニア詳細（`/engineers/[id]`）

- **タブ切替**:
  - **構造化情報**: スキル一覧（バッジ表示）、経験年数、業界、稼働条件、ソフトスキル
  - **原文テキスト**: `raw_text` をそのまま表示。Claude が抽出した元テキスト
  - **ファイルプレビュー**: アップロードされたファイルの表示（PDF はインラインプレビュー、Word/Excel はダウンロードリンク + テキスト表示）
- **アクションボタン**: 編集、削除、再アップロード

### エンジニア編集（`/engineers/[id]/edit`）

- 登録と同じフォーム（既存データがプリフィル済み）
- 再アップロード: 新しいファイルをアップロードして再解析 → フォーム上書き
- 保存時に Embedding を再生成

## データモデル

### engineers テーブル（既存）

```sql
create table public.engineers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
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
```

### documents テーブル（既存）

```sql
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  engineer_id uuid references public.engineers(id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  parsed_content text,
  created_at timestamptz not null default now()
);
```

## Server Actions

### `parseDocument(formData: FormData)`
- ファイルを受け取り、Supabase Storage にアップロード
- ファイル形式に応じてテキスト抽出:
  - PDF: AI SDK の FilePart で Claude に直接送信
  - Word(.docx): サーバーサイドでテキスト抽出 → Claude で構造化
  - Excel(.xlsx): サーバーサイドでテキスト抽出 → Claude で構造化
- Claude（`generateText` + `Output.object` + Zod スキーマ）で構造化 JSON に変換
- 構造化結果 + Storage パス + raw_text を返す

### `createEngineer(formData: FormData)`
- フォームデータをバリデーション（Zod）
- engineers テーブルに INSERT
- documents テーブルに INSERT（ファイルがある場合）
- OpenAI Embedding 生成 → engineers.embedding を UPDATE
- `/engineers` にリダイレクト

### `updateEngineer(id: string, formData: FormData)`
- engineers テーブルを UPDATE
- ファイルが再アップロードされた場合:
  - 古い documents を削除
  - 新しい documents を INSERT
- Embedding を再生成
- `/engineers/[id]` にリダイレクト

### `deleteEngineer(id: string)`
- Supabase Storage から関連ファイルを削除
- engineers テーブルから DELETE（CASCADE で documents も削除）
- `/engineers` にリダイレクト

## AI 連携

### Claude による構造化（PDF/Word/Excel → JSON）

```typescript
// AI SDK 6 の構造化出力
const result = await generateText({
  model: llm,
  messages: [
    {
      role: "user",
      content: [
        { type: "file", data: fileBuffer, mimeType: "application/pdf" },
        { type: "text", text: "このスキルシートから情報を構造化してください。" }
      ]
    }
  ],
  output: Output.object({
    schema: engineerSchema, // Zod スキーマ
  }),
});
```

### Zod スキーマ（構造化出力用）

```typescript
const engineerSchema = z.object({
  name: z.string(),
  email: z.string().nullable(),
  skills: z.array(z.object({
    name: z.string(),
    level: z.enum(["beginner", "intermediate", "advanced", "expert"]),
    years: z.number(),
  })),
  experience_years: z.number(),
  industries: z.array(z.string()),
  availability: z.object({
    rate_min: z.number().nullable(),
    rate_max: z.number().nullable(),
    start_date: z.string().nullable(),
    remote: z.boolean(),
    location: z.string().nullable(),
  }),
  soft_skills: z.array(z.object({
    name: z.string(),
    description: z.string().nullable(),
  })),
});
```

### OpenAI Embedding 生成

```typescript
import { embed } from "ai";
import { embeddingModel } from "@/lib/ai/provider";

// エンジニア情報をテキスト化して Embedding 生成
const text = `${engineer.name} ${engineer.skills.map(s => s.name).join(" ")} ...`;
const { embedding } = await embed({
  model: embeddingModel,
  value: text,
});
```

## ファイルストレージ

- **Supabase Storage** の `documents` バケットを使用
- パス: `{org_id}/{engineer_id}/{file_name}`
- アップロードサイズ上限: 10MB
- 対応形式: `.pdf`, `.docx`, `.xlsx`

## Word/Excel テキスト抽出

- **Word (.docx)**: `mammoth` パッケージでテキスト抽出
- **Excel (.xlsx)**: `xlsx` (SheetJS) パッケージでテキスト抽出
- 抽出したテキストを Claude に送信して構造化

## ファイルプレビュー

- **PDF**: `<iframe>` または `<object>` タグでインラインプレビュー（Supabase Storage の公開 URL）
- **Word/Excel**: ダウンロードリンク + `parsed_content`（抽出テキスト）を表示

## ディレクトリ構成

```
src/
├── app/(dashboard)/
│   └── engineers/
│       ├── page.tsx                    ← 一覧
│       ├── new/
│       │   └── page.tsx               ← 新規登録
│       ├── [id]/
│       │   ├── page.tsx               ← 詳細
│       │   └── edit/
│       │       └── page.tsx           ← 編集
│       └── _components/
│           ├── engineer-table.tsx      ← 一覧テーブル
│           ├── engineer-form.tsx       ← 登録・編集フォーム
│           ├── engineer-detail.tsx     ← 詳細表示
│           ├── file-upload.tsx         ← ファイルアップロード
│           ├── file-preview.tsx        ← ファイルプレビュー
│           └── search-filter.tsx       ← 検索・フィルタ
├── actions/
│   └── engineers.ts                   ← Server Actions
├── lib/
│   └── ai/
│       ├── provider.ts                ← 既存
│       ├── parse-document.ts          ← ドキュメント解析ロジック
│       └── embedding.ts               ← Embedding 生成ロジック
└── types/
    └── index.ts                       ← 既存（Engineer, Skill 等）
```

## エラーハンドリング

| シーン | 対応 |
|--------|------|
| ファイル形式が対応外 | アップロード前にフロントでバリデーション |
| ファイルサイズ超過（10MB超） | アップロード前にフロントでバリデーション |
| Claude 解析失敗 | エラーメッセージ表示 + 手動フォーム入力にフォールバック |
| Embedding 生成失敗 | エンジニア情報は保存、Embedding は null のまま。リトライボタン表示 |
| Supabase Storage アップロード失敗 | エラーメッセージ表示 + リトライ |

## 追加パッケージ

- `mammoth` — Word (.docx) テキスト抽出
- `xlsx` — Excel (.xlsx) テキスト抽出
