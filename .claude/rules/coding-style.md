# コーディングスタイル

## フォーマッター / リンター

- **Biome** を使用（ESLint / Prettier は不使用）
- コード変更後は `pnpm run check` で lint + format を一括適用

## TypeScript

- `any` を避け、適切な型を定義する
- 型は `src/types/` に集約
- `import type { Foo }` 形式を使う（型のみの import は型 import にする）

## React

- 関数宣言 `function Component()` を使う（アロー関数ではなく）
- コンポーネントはファイルのトップレベルで定義（ネスト禁止）
- 再利用コンポーネントは named export（`export function`）

## Server Actions

- `src/actions/` に集約
- `useActionState` で pending / error 状態を管理

## CSS / スタイリング

- クラス結合には `cn()` ヘルパー（`src/lib/utils.ts`）
- バリエーションには `class-variance-authority (cva)`

## UI コンポーネント

- shadcn/ui を使用。追加時は `pnpm dlx shadcn@latest add <component>`
- `src/components/ui/` に配置

## 命名規則

- ファイル・ディレクトリは **kebab-case**
- プライベートフォルダは `_` プレフィックス（ルーティングから除外）
- 関連ファイルは同じディレクトリに併置（コロケーション）
