# Revision Log

ミスや修正パターンを記録し、同じ失敗を繰り返さないためのログ。

| 日付 | 何が起きたか | どう直したか | 次回の防止策 |
|------|-------------|-------------|-------------|
| 2026-03-27 | pnpm workspace で `@repo/types: "*"` としたら npm registry を参照してしまった | `"workspace:*"` に変更 | pnpm monorepo では必ず `workspace:` プロトコルを使う |
| 2026-03-27 | Turborepo が `packageManager` フィールド未設定でエラー | root の package.json に `"packageManager": "pnpm@10.30.0"` を追加 | pnpm + Turborepo 構成では `packageManager` を必ず指定する |
| 2026-03-28 | モノレポ構成で NestJS + Next.js を用意したが、設計見直しで Next.js 単体に変更 | apps/frontend をルートに引き上げ、NestJS/Turborepo/libs を削除 | 設計が固まる前にフォルダ構成を作り込みすぎない。要件定義→設計→構築の順を守る |
