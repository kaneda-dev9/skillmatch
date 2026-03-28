# CLAUDE.md

## 言語

すべての応答・コメント・コミットメッセージ・このファイル自体も日本語で記述すること。
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
- `pnpm run lint` — Lint 実行
- `pnpm run check` — Lint + Format 一括適用（Biome）
- `pnpm run test` — テスト実行（Vitest）
- `pnpm run test:ui` — テスト UI 起動

---

## superpowers ワークフロー（必須）

すべての作業は以下のワークフローに従うこと。**スキップ禁止**。

```
1. Brainstorming（設計前）
   → superpowers:brainstorming
   新機能・変更の前に必ず実行。要件の明確化、設計の検討。
   些細な修正（typo、1行変更）のみ免除。

2. Planning（設計後）
   → superpowers:writing-plans
   ブレスト承認後、実装計画を作成。タスクを2〜5分単位に分解。

3. Implementation（計画承認後）
   → superpowers:executing-plans または superpowers:subagent-driven-development
   計画に沿ってタスクを実行。独立タスクはサブエージェントで並列化。

4. TDD（実装中）
   → superpowers:test-driven-development
   各タスクで Red → Green → Refactor を実施。テストなしのコードは書かない。

5. Verification（完了前）
   → superpowers:verification-before-completion
   ビルド・テスト・lint が通ることを確認してから完了を宣言。

6. Finishing（全タスク完了後）
   → superpowers:finishing-a-development-branch
   テスト確認 → マージ/PR/破棄の選択肢を提示。
```

**判断基準**: 1%でも該当する可能性があればスキルを呼び出す。
**バグ修正**: `superpowers:systematic-debugging` を先に使う。
**コードレビュー依頼時**: `superpowers:requesting-code-review` を使う。

---

## 7つの原則

### 1. 計画優先 (Plan Mode Default)

3ステップ以上のタスクは、実装に着手する前に必ず計画を提示してユーザーの承認を得ること。
計画には以下を含める:

- 変更対象のファイル一覧
- 各ステップの概要
- 影響範囲とリスク

些細な修正（typo、1ファイルの小さな変更など）はこの限りではない。

### 2. サブエージェント戦略 (Subagent Strategy)

メインのコンテキストウィンドウを汚さないために、以下のタスクはサブエージェントに委譲する:

- コードベースの調査・検索
- ドキュメントやライブラリの調査
- 独立した分析タスク

長時間セッションでの精度劣化を防ぐため、リサーチ系は積極的にサブエージェントを活用すること。

### 3. 自己改善ループ (Self-Improvement Loop)

ミスや修正が発生した場合、そのパターンを `revision_log.md` に記録する。

- **記録対象**: ビルドエラー、型ミス、方針のズレ、ユーザーからの修正指示
- **記録形式**: 日付、何が起きたか、どう直したか、次回の防止策
- 新しいセッション開始時に `revision_log.md` を確認し、同じミスを繰り返さない

### 4. テスト駆動開発 (Test-Driven Development)

機能実装時は `superpowers:test-driven-development` スキルに従い、テストを先に書く。

- **テストフレームワーク**: Vitest + React Testing Library
- **テストファイル**: `src/**/*.test.ts(x)` に配置（コロケーション）
- **実装前にテストを書く**: Red → Green → Refactor のサイクル
- **カバレッジ対象**:
  - Server Actions のロジック
  - ユーティリティ関数
  - Client Components のレンダリング・インタラクション
- **非同期 Server Components**: E2E テスト（Playwright）で対応（将来追加）

テストが通らない状態で「完了」とは言わない。

### 5. 完了前検証 (Verification Before Done)

タスク完了を宣言する前に、以下を自問する:

> 「スタッフエンジニアがレビューして承認するレベルか？」

具体的なチェック項目:
- `pnpm run build` が通るか
- `pnpm run test` が通るか
- 型エラーがないか
- 既存の機能を壊していないか
- 不要なコードや console.log が残っていないか

ビルドやテストが通らない状態で「完了」とは言わない。

### 6. 洗練された設計 (Demand Elegance)

設計判断を含む変更（アーキテクチャ変更、新しいパターン導入など）では:

- 力技で実装する前に、2〜3のアプローチを比較検討する
- それぞれのトレードオフを明示する
- ユーザーに選択肢を提示してから実装する

些細な修正やバグフィックスには適用しない。シンプルに直す。

### 7. 自律的バグ修正 (Autonomous Bug Fixing)

バグ報告を受けたら:

1. ユーザーに質問する前に、まず自分で調査する
2. 原因を特定し、修正案を実装する
3. **設計判断が必要な場合のみ**ユーザーに確認を取る

調査は自律的に、設計判断だけ確認。「どのファイルですか？」と聞く前にまず探す。
