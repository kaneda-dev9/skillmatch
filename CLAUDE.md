# CLAUDE.md

## 言語

すべての応答・コメント・コミットメッセージも日本語で記述すること。
コード中の変数名・関数名は英語のまま。

## プロジェクト概要

SkillMatch — AIマッチングツール。Next.js 単体構成。

```
src/
├── app/           — ページ・レイアウト（App Router）
├── actions/       — Server Actions
├── components/    — UIコンポーネント（shadcn/ui）
├── lib/           — ユーティリティ（Supabase, AI SDK）
└── types/         — 型定義
```

## 技術スタック

- **パッケージマネージャ**: pnpm
- **フレームワーク**: Next.js 16 (App Router), React 19, TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **AI連携**: Vercel AI SDK 6 (@ai-sdk/anthropic + @ai-sdk/openai)
- **DB/認証**: Supabase (PostgreSQL + pgvector + Auth + RLS)
- **デプロイ**: Vercel

## コマンド

- `pnpm run dev` — 開発サーバー起動
- `pnpm run build` — ビルド
- `pnpm run check` — Lint + Format 一括適用（Biome）
- `pnpm run test` — テスト実行（Vitest）

## ワークフロー

superpowers スキルのワークフローに従うこと（Brainstorm → Plan → Implement → TDD → Verify → Finish）。
些細な修正（typo、1行変更）のみ免除。バグ修正は `superpowers:systematic-debugging` を先に使う。

### 技術スキル（コード作成・レビュー時に参照）

| スキル | 使用タイミング |
|--------|---------------|
| `vercel-react-best-practices` | React/Next.js コード |
| `vercel-composition-patterns` | コンポーネント設計・Props 設計 |
| `ai-sdk` | AI SDK 使用時 |
| `supabase-postgres-best-practices` | SQL・スキーマ設計 |
| `ui-ux-pro-max` | UI/UX 設計・レビュー |
| `frontend-design:frontend-design` | フロントエンド画面構築 |

## 原則

- **計画優先**: 3ステップ以上のタスクは計画を提示し承認を得てから着手
- **サブエージェント活用**: リサーチ・調査・独立した分析はサブエージェントに委譲
- **自己改善**: ミス発生時は `revision_log.md` に記録。セッション開始時に確認
- **TDD**: Vitest + React Testing Library。テストファイルは `src/**/*.test.ts(x)` にコロケーション
- **完了前検証**: build / test / lint が通ることを確認してから完了宣言
- **自律的バグ修正**: 質問前にまず自分で調査。設計判断のみユーザーに確認
