# SkillMatch

**AI を活用した SES エンジニアマッチング＆提案書自動生成プラットフォーム**

Claude と OpenAI Embeddings を組み合わせたハイブリッド AI で、案件に最適なエンジニアを自動マッチングし、提案書をリアルタイム生成します。

**本番URL:** https://skillmatch-seven.vercel.app

---

## 主な機能

### AI マッチングエンジン

pgvector によるベクトル類似度検索で候補を絞り込み、Claude が 5 つの評価軸（スキル・経験年数・業界・条件・ソフトスキル）でスコアリング。並列処理で高速に評価します。

### 提案書の自動生成

マッチング結果をもとに Claude がマークダウン形式の提案書をストリーミング生成。リアルタイムプレビュー、2 カラム / タブ切り替えエディタ、PDF エクスポートに対応しています。

### ドキュメント AI パース

PDF・Word・Excel 形式のスキルシートをアップロードすると、AI がスキル・経験・業界などの構造化データを自動抽出。手入力の手間を大幅に削減します。

### マルチテナント対応

組織単位のデータ分離を PostgreSQL の Row-Level Security（RLS）で実装。アプリケーション層でも org_id による認可チェックを行う多層防御を採用しています。

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **フレームワーク** | Next.js 16 (App Router) / React 19 / TypeScript 5 |
| **AI** | Vercel AI SDK 6 / Claude Sonnet 4.6 (評価・生成) / OpenAI text-embedding-3-small (ベクトル化) |
| **DB / 認証** | Supabase (PostgreSQL + pgvector + Auth + RLS + Storage) |
| **UI** | shadcn/ui + Tailwind CSS 4 + Lucide Icons |
| **品質** | Biome (Lint + Format) / Vitest + React Testing Library |
| **デプロイ** | Vercel |

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│  Client (React 19 + shadcn/ui)                      │
│  ├── ダッシュボード / エンジニア管理 / 案件管理           │
│  ├── マッチング結果閲覧                                │
│  └── 提案書エディタ（ストリーミング表示）                 │
└─────────────┬───────────────────────────────────────┘
              │ Server Actions / API Routes
┌─────────────▼───────────────────────────────────────┐
│  Next.js Server (App Router)                        │
│  ├── Server Actions (認証・バリデーション・認可)        │
│  ├── AI モジュール (マッチング・提案書・パース)           │
│  └── Supabase Client (SSR)                          │
└──────┬──────────────────┬───────────────────────────┘
       │                  │
┌──────▼──────┐   ┌──────▼──────────────────┐
│  Supabase   │   │  AI Providers           │
│  PostgreSQL │   │  ├── Anthropic (Claude)  │
│  + pgvector │   │  └── OpenAI (Embeddings) │
│  + Auth     │   └─────────────────────────┘
│  + Storage  │
│  + RLS      │
└─────────────┘
```

---

## データベース設計

```
organizations ─┬── users (role: admin/member)
               ├── engineers (skills, embedding[1536])
               │     └── documents (PDF/Word/Excel)
               ├── projects (required_skills, embedding[1536])
               │     └── matches (5軸スコア + AI推論)
               │           └── proposals (Markdown)
               └── [Storage] documents バケット
```

- **ベクトルインデックス**: IVFFlat で高速な類似度検索
- **RLS**: 全テーブルで `org_id` ベースのアクセス制御
- **カスケード削除**: 外部キー制約による自動クリーンアップ

---

## AI パイプライン

### マッチングフロー

```
案件登録 → Embedding 生成 (OpenAI)
                ↓
       pgvector で上位10件の候補を取得
                ↓
       Claude が各候補を5軸で評価 (並列実行)
                ↓
       スコア + 推論テキストを DB に保存
```

### 提案書生成フロー

```
マッチング結果を選択
        ↓
案件 + エンジニア + スコアをプロンプトに構成
        ↓
Claude がマークダウンをストリーミング生成
        ↓
リアルタイムプレビュー → 編集 → 保存 / PDF出力
```

---

## セキュリティ

| 対策 | 実装 |
|------|------|
| **認証** | Supabase Auth (Email/Password + Google OAuth) |
| **認可（DB層）** | Row-Level Security で組織間のデータ完全分離 |
| **認可（アプリ層）** | 全 Server Action で org_id チェック（多層防御） |
| **入力検証** | Zod スキーマによるランタイムバリデーション |
| **CSRF** | Next.js Server Actions の自動 CSRF 保護 |
| **セキュリティヘッダー** | X-Frame-Options, X-Content-Type-Options, Referrer-Policy 等 |
| **ファイルアップロード** | MIME タイプ検証 + 10MB サイズ制限 |
| **SQL インジェクション** | Supabase SDK のパラメータ化クエリのみ使用 |

---

## セットアップ

### 必要条件

- Node.js 24+
- pnpm 10+
- Supabase プロジェクト

### インストール

```bash
git clone https://github.com/your-username/skillmatch.git
cd skillmatch
pnpm install
```

### 環境変数

`.env.local` を作成:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
```

### データベース

Supabase ダッシュボードの SQL Editor で `supabase/migrations/` 内のマイグレーションを順番に実行してください。

### 開発サーバー

```bash
pnpm dev
```

### その他のコマンド

```bash
pnpm run build    # プロダクションビルド
pnpm run check    # Lint + Format (Biome)
pnpm run test     # テスト実行 (Vitest)
```

---

## プロジェクト構成

```
src/
├── app/                    # ページ・レイアウト (App Router)
│   ├── (auth)/             #   ログイン・サインアップ
│   ├── (dashboard)/        #   ダッシュボード・各管理画面
│   └── api/                #   API Routes (提案書ストリーミング)
├── actions/                # Server Actions (認証・CRUD・マッチング)
├── components/             # UI コンポーネント
│   ├── ui/                 #   shadcn/ui ベースコンポーネント
│   ├── auth/               #   認証関連
│   ├── engineers/          #   エンジニア管理
│   ├── projects/           #   案件管理
│   ├── matching/           #   マッチング
│   └── proposals/          #   提案書エディタ
├── lib/                    # ユーティリティ
│   ├── ai/                 #   AI モジュール (マッチング・Embedding・パース)
│   ├── supabase/           #   Supabase クライアント (Browser/Server)
│   └── validations/        #   Zod スキーマ
└── types/                  # 型定義
```
