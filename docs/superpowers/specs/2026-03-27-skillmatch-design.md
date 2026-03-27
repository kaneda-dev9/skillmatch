# SkillMatch — AIマッチングツール設計書

## 概要

SES営業・転職エージェント・フリーランスエージェント向けのAIマッチングツール。
エンジニアの職務経歴書（スキルシート）と開発案件をAIで自動照合し、マッチ度を数値化する。
マッチした候補の提案書を自動生成し、人材提案の精度向上と営業業務の効率化を実現する。

## ターゲットユーザー

- SES営業担当
- 転職エージェント
- フリーランスエージェント

企業の採用担当はスコープ外。あくまで「エンジニアを企業に提案する側の人」が利用する。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16（App Router） |
| UI | shadcn/ui + Tailwind CSS 4 |
| AI連携 | Vercel AI SDK 6（`ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai`） |
| LLM | Claude API — `claude-sonnet-4.6`（構造化・評価・提案書生成） |
| Embedding | OpenAI `text-embedding-3-small`（1536次元） |
| DB | Supabase（PostgreSQL + pgvector） |
| 認証 | Supabase Auth |
| テナント分離 | PostgreSQL RLS（Row Level Security） |
| ファイルストレージ | Supabase Storage |
| デプロイ | Vercel |

## アーキテクチャ

### 構成

Next.js 単体構成。Server Actions と Route Handlers がバックエンドの役割を担う。

```
Next.js (App Router)
├── Server Actions     → ビジネスロジック（CRUD、AI連携、マッチング）
├── Route Handlers     → ストリーミング（提案書生成）、Webhook
├── Server Components  → Supabase からデータ取得・表示
├── Client Components  → shadcn/ui インタラクティブUI
└── Proxy (proxy.ts)   → 認証チェック（Next.js 16 で middleware → proxy に名称変更）
```

### 外部サービス

- **Supabase**: PostgreSQL + pgvector + Auth + RLS + Storage
- **Claude API**: `@ai-sdk/anthropic` 経由。PDF解析、構造化、評価、提案書生成
- **OpenAI API**: `@ai-sdk/openai` 経由。Embedding 生成のみ

### AI連携（Vercel AI SDK 6）

`createProviderRegistry()` で Claude と OpenAI を統一管理する。

**重要: v6 での API 変更点**
- `generateObject` は非推奨。`generateText` + `Output.object({ schema })` で構造化出力を行う
- Embedding メソッド名: `textEmbedding()` → `embedding()` に変更
- `useChat` フック: `append()` → `sendMessage()` に変更、`isLoading` → `status` に変更

- **Claude API（@ai-sdk/anthropic v3）**
  - PDF/Word → 構造化JSON変換（`generateText` + `Output.object({ schema: zodSchema })` で型安全に出力）
  - マッチング詳細評価（スコア算出 + 評価理由生成）
  - 提案書生成（`streamText` でストリーミングレスポンス）
  - PDF入力: `FilePart`（`type: 'file'`, `mediaType: 'application/pdf'`）で直接送信可能
- **OpenAI API（@ai-sdk/openai v3）**
  - `openai.embedding('text-embedding-3-small')` でテキストをベクトル化
  - `embed()` / `embedMany()` で一括処理

## マッチングパイプライン（ハイブリッド方式）

```
① PDF/Word アップロード
    ↓
② Claude で構造化JSONに変換
   （スキル、経験年数、業界、稼働条件、ソフトスキルを抽出）
    ↓
③ OpenAI で Embedding化 → pgvector に保存
    ↓
④ 案件登録時（またはマッチング実行時）に pgvector で類似検索
   → 上位候補を高速に抽出
    ↓
⑤ 上位候補を Claude で詳細評価
   → 総合スコア + 項目別スコア + 評価理由を生成
    ↓
⑥ スコア付きリストを表示
```

### マッチング評価項目

| 項目 | 説明 |
|------|------|
| 技術スキル | 言語、フレームワーク、ツールの一致度 |
| 経験年数 | 該当技術や業界での経験年数 |
| 業界・ドメイン経験 | 金融、医療、ECなど業界知識の一致 |
| 稼働条件 | 単価、稼働時期、リモート可否、勤務地 |
| ソフトスキル | リーダー経験、コミュニケーション、マネジメント |

すべてを総合的に判断し、0〜100の総合スコアを算出する。

## データモデル

全テーブルに `org_id` を持ち、RLSでテナント分離する。

### organizations（組織）

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | |
| name | text | 組織名 |
| plan | text | 料金プラン（将来用） |
| created_at | timestamp | |

### users（ユーザー）

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | Supabase Auth uid と一致 |
| org_id | uuid FK | → organizations |
| email | text | |
| name | text | |
| role | enum | admin, member |
| created_at | timestamp | |

### engineers（エンジニア）

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | |
| org_id | uuid FK | → organizations |
| name | text | |
| email | text? | |
| skills | jsonb | 構造化スキル情報（スキル名、レベル、年数） |
| experience_years | int | 総経験年数 |
| industries | text[] | 業界経験 |
| availability | jsonb | 稼働条件（単価、時期、リモート等） |
| soft_skills | jsonb | ソフトスキル |
| raw_text | text | 元のスキルシート全文 |
| embedding | vector(1536) | Embedding ベクトル |
| created_at | timestamp | |

### projects（案件）

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | |
| org_id | uuid FK | → organizations |
| title | text | 案件名 |
| client_name | text | 企業名 |
| required_skills | jsonb | 要求スキル |
| experience_years | int | 求める経験年数 |
| industries | text[] | 業界 |
| conditions | jsonb | 稼働条件（単価、リモート等） |
| description | text | 案件説明全文 |
| embedding | vector(1536) | Embedding ベクトル |
| status | enum | open, closed |
| created_at | timestamp | |

### matches（マッチング結果）

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | |
| org_id | uuid FK | → organizations |
| project_id | uuid FK | → projects |
| engineer_id | uuid FK | → engineers |
| overall_score | float | 総合スコア (0-100) |
| skill_score | float | 技術スキルスコア |
| experience_score | float | 経験年数スコア |
| industry_score | float | 業界スコア |
| condition_score | float | 条件スコア |
| soft_skill_score | float | ソフトスキルスコア |
| ai_reasoning | text | AIの評価理由 |
| created_at | timestamp | |

### documents（アップロードファイル）

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | |
| org_id | uuid FK | → organizations |
| engineer_id | uuid FK? | → engineers |
| project_id | uuid FK? | → projects |
| file_name | text | |
| file_path | text | Supabase Storage 上のパス |
| file_type | text | pdf, docx 等 |
| parsed_content | text | 抽出テキスト |
| created_at | timestamp | |

### proposals（提案書）

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | |
| org_id | uuid FK | → organizations |
| match_id | uuid FK | → matches |
| content | text | 生成された提案文 |
| format | text | markdown, pdf |
| created_at | timestamp | |

## 画面構成

サイドバー付きダッシュボードレイアウト。

### 画面一覧

| 画面 | パス | 機能 |
|------|------|------|
| ダッシュボード | /dashboard | 統計サマリー、最近のアクティビティ |
| エンジニア一覧 | /engineers | 検索・フィルタ・ソート |
| エンジニア登録 | /engineers/new | フォーム入力 or ファイルアップロード |
| エンジニア詳細 | /engineers/[id] | 構造化スキル情報、元ファイルプレビュー |
| 案件一覧 | /projects | ステータス・企業名でフィルタ |
| 案件登録 | /projects/new | フォーム入力 or ファイルアップロード |
| 案件詳細 | /projects/[id] | 要件、条件、ステータス管理 |
| マッチング | /matching | 案件選択 → 実行 → 結果リスト |
| マッチング結果 | /matching/[projectId] | スコア降順リスト、AI評価理由、提案書生成ボタン |
| 提案書 | /proposals | 生成履歴一覧 |
| 提案書詳細 | /proposals/[id] | プレビュー・編集・ダウンロード |
| 設定 | /settings | 組織情報、APIキー管理 |
| メンバー管理 | /settings/members | ユーザー招待、ロール管理 |

### 入力方式

エンジニア・案件ともに2つの登録方法を提供:

1. **ファイルアップロード**: PDF/Wordをアップロード → Claude が自動で構造化 → 確認画面で修正可能
2. **フォーム入力**: 構造化されたフォームに手動入力

### 出力

- **マッチ結果リスト**: 総合スコア降順、項目別スコア表示、AI評価理由の展開表示
- **提案書**: マッチ結果から自動生成、プレビュー・編集・PDF/Markdownダウンロード

## ディレクトリ構成

```

├── src/
│   ├── app/
│   │   ├── (auth)/                ← 認証画面
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (dashboard)/           ← 認証済み画面群
│   │   │   ├── dashboard/
│   │   │   ├── engineers/
│   │   │   ├── projects/
│   │   │   ├── matching/
│   │   │   ├── proposals/
│   │   │   └── settings/
│   │   ├── api/                   ← Route Handlers
│   │   │   ├── chat/route.ts      ← 提案書ストリーミング生成
│   │   │   └── webhooks/route.ts
│   │   └── layout.tsx
│   ├── actions/                   ← Server Actions
│   │   ├── engineers.ts
│   │   ├── projects.ts
│   │   ├── matching.ts
│   │   ├── proposals.ts
│   │   └── auth.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts          ← サーバーサイド用クライアント
│   │   │   └── client.ts          ← クライアントサイド用クライアント
│   │   ├── ai/
│   │   │   ├── provider.ts        ← Provider Registry
│   │   │   ├── schemas.ts         ← Zodスキーマ（構造化出力定義）
│   │   │   └── prompts.ts         ← プロンプトテンプレート
│   │   └── utils.ts
│   ├── components/
│   │   ├── ui/                    ← shadcn/ui
│   │   ├── engineers/
│   │   ├── projects/
│   │   ├── matching/
│   │   └── layout/                ← サイドバー、ヘッダー等
│   └── types/                     ← 型定義
│       └── index.ts
└── ...
```

## セキュリティ

| 項目 | 対策 |
|------|------|
| 認証 | Supabase Auth（JWT）。Next.js Proxy (`proxy.ts`) で全 `(dashboard)` ルートを保護 |
| テナント分離 | PostgreSQL RLS で全テーブルを org_id でフィルタ。DB層で完結 |
| APIキー管理 | Claude/OpenAI のキーはサーバーサイドのみ（環境変数）。フロントに露出しない |
| ファイルアップロード | MIMEタイプ検証、10MB上限、Supabase Storage バケットポリシー |
| レート制限 | Next.js Proxy or Vercel のレート制限機能 |

## エラーハンドリング

| シーン | 対応 |
|--------|------|
| PDF/Word解析失敗 | ユーザーに通知 + 手動フォーム入力にフォールバック |
| Claude API タイムアウト | リトライ（最大3回、exponential backoff）→ 失敗時はエラー表示 |
| Embedding生成失敗 | リトライ → 失敗時はマッチング対象から一時除外、通知 |
| マッチング候補ゼロ | 「条件に合う候補が見つかりませんでした」+ 条件緩和の提案表示 |
| ファイルサイズ超過 | アップロード前にフロントでバリデーション（上限: 10MB） |

## 将来の拡張（現スコープ外、設計時に考慮）

- スキルシート自動生成機能（求職者向け）
- ベクトルDB分離（pgvector → Pinecone等、リポジトリ層の抽象化で対応）
- SaaS課金（Stripe連携）
- 分析ダッシュボード（マッチング成功率、提案数の推移等）
- モバイルアプリ対応（必要時に API層を分離）
