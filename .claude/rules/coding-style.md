# コーディングスタイル

## フォーマッター / リンター

- **Biome** を使用（ESLint / Prettier は不使用）
- ルールは `biome.json` を参照
- コード変更後は `pnpm run check` で lint + format を一括適用すること

## TypeScript

- `any` を避け、適切な型を定義する
- 型は `src/types/` に集約する
- `import type { Foo }` 形式を使う（型のみの import は型 import にする）
- `import React from "react"` は不要（JSX Transform により自動処理）

## React

### コンポーネント定義

- 関数宣言 `function Component()` を使う（アロー関数ではなく）
- コンポーネントは必ずファイルのトップレベルで定義する（ネスト禁止）
- コンポーネントは純粋関数として実装する（レンダリング中に副作用を起こさない）

### Export パターン

| 対象                  | パターン                                   | 理由                              |
| --------------------- | ------------------------------------------ | --------------------------------- |
| page / layout / route | `export default function`                  | Next.js の規約                    |
| 再利用コンポーネント  | `export function` (named)                  | 明示的な import を強制            |
| Server Actions        | `export async function` (named)            | 複数 Action を1ファイルで定義可能 |
| ユーティリティ        | `export function` / `export const` (named) | 明示的                            |

### Hooks ルール

- トップレベルでのみ呼び出す（ループ・条件分岐・ネスト関数の中では使わない）
- React コンポーネントまたはカスタム Hook 内でのみ使用する
- カスタム Hook は `use` プレフィックスを付ける（通常の関数には付けない）
- `useEffect` は cleanup 関数でクリーンアップする

## Next.js (App Router)

### Server Component / Client Component

- Server Component をデフォルトとする
- `"use client"` はインタラクティビティ（状態管理、イベントハンドラ、ブラウザ API）が必要な場合のみ
- Server Component のデータを Client Component に渡すときは、シリアライズ可能な Props にする
- Client Component の children に Server Component を渡すコンポジションパターンを活用する

### Server Actions

- `"use server"` ディレクティブでサーバー関数を定義
- Server Actions は `src/actions/` に集約する
- フォーム送信には `<form action={serverAction}>` パターンを使う
- クライアントから追加引数を渡す場合は `.bind()` パターンを使う
- `useActionState` で pending / error 状態を管理する

### データフェッチ

- Server Component 内で直接 `async/await` でデータを取得する
- キャッシュ戦略を明示的に指定する:
  - 静的データ: `fetch(url, { cache: "force-cache" })`
  - 動的データ: `fetch(url, { cache: "no-store" })`
  - ISR: `fetch(url, { next: { revalidate: 秒数 } })`
- `revalidatePath()` / `revalidateTag()` でオンデマンド無効化する

### Metadata

- `export const metadata` または `export async function generateMetadata()` を使う
- `<head>` タグを手動で管理しない

### パスエイリアス

- `@/` を使う（相対パスではなく）

## CSS / スタイリング

- Tailwind CSS 4 のユーティリティクラスを使う
- クラス結合には `cn()` ヘルパー（`src/lib/utils.ts`）を使う
- コンポーネントのバリエーションには `class-variance-authority (cva)` を使う

## UI コンポーネント

- shadcn/ui を使用する
- `src/components/ui/` に配置される
- 追加時は `pnpm dlx shadcn@latest add <component>` を使う

## ファイル・ディレクトリ命名規則

| 対象                 | 規則               | 例                               |
| -------------------- | ------------------ | -------------------------------- |
| コンポーネント       | kebab-case         | `button.tsx`, `data-table.tsx`   |
| ページ / レイアウト  | Next.js 規約       | `page.tsx`, `layout.tsx`         |
| ユーティリティ       | kebab-case         | `utils.ts`, `supabase-client.ts` |
| 型定義               | kebab-case         | `database.ts`, `api-types.ts`    |
| Server Actions       | kebab-case         | `auth-actions.ts`                |
| プライベートフォルダ | `_` プレフィックス | `_components/`, `_utils/`        |

- プライベートフォルダ（`_` プレフィックス）はルーティングから除外される
- 関連ファイルは同じディレクトリに併置する（コロケーション）

## import 順序

1. React / Next.js（`import React` は不要）
2. 外部ライブラリ
3. `@/` 内部モジュール
4. 相対パス
5. 型 import
