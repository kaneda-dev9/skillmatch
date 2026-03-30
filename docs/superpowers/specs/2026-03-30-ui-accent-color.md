# UIアクセントカラー改善 設計書

## 概要

現在のモノトーン（グレースケール）UIにティール系アクセントカラーを導入し、ボタン・リンク・バッジ・サイドバーに色味を追加する。併せて、スキルバッジに言語・フレームワークごとのブランドカラーを適用する。

## スコープ

- テーマカラー変更（globals.css の CSS 変数）
- スキルカラーマップの定義（スキル名 → カラー対応表）
- SkillBadge 共通コンポーネントの作成
- 既存画面のスキルバッジを SkillBadge に置き換え

### スコープ外

- ダークモード対応
- ロゴデザインの変更

## テーマカラー変更

`src/app/globals.css` の `:root` CSS 変数を変更する。

### 変更対象

| 変数 | Before | After | 用途 |
|------|--------|-------|------|
| `--primary` | `oklch(0.205 0 0)` (黒) | `oklch(0.627 0.194 175.1)` (#0d9488) | ボタン、アクティブ項目 |
| `--primary-foreground` | `oklch(0.985 0 0)` (白) | `oklch(0.985 0 0)` (白、変更なし) | ボタン文字色 |
| `--ring` | `oklch(0.708 0 0)` (グレー) | `oklch(0.627 0.194 175.1)` | フォーカスリング |
| `--sidebar` | `oklch(0.985 0 0)` | `oklch(0.98 0.014 175)` (#f0fdfa 相当) | サイドバー背景 |
| `--sidebar-primary` | `oklch(0.205 0 0)` (黒) | `oklch(0.627 0.194 175.1)` | サイドバーアクティブ |
| `--chart-1` 〜 `--chart-5` | グレースケール | ティール系グラデーション | チャート色 |

ミニマルなデザインを維持するため、secondary / muted / accent / border はグレー系のまま変更しない。

## スキルカラーマップ

`src/lib/skill-colors.ts` に定義。

### 対応スキル一覧

**フロントエンド:**
- React: `#61dafb` / TypeScript: `#3178c6` / JavaScript: `#f7df1e` / Next.js: `#000000` / Vue.js: `#42b883` / Tailwind CSS: `#06b6d4` / Figma: `#f24e1e`

**バックエンド:**
- Python: `#3776ab` / Django: `#092e20` / Java: `#b07220` / Spring Boot: `#6db33f` / Go: `#00add8` / Node.js: `#68a063` / NestJS: `#e0234e` / PHP: `#4f5b93` / Ruby: `#cc342d` / Rails: `#cc0000` / Laravel: `#ff2d20`

**インフラ / クラウド:**
- AWS: `#ff9900` / GCP: `#4285f4` / Azure: `#0078d4` / Docker: `#2496ed` / Kubernetes: `#326ce5` / Terraform: `#7b42bc`

**データベース:**
- PostgreSQL: `#336791` / MySQL: `#4479a1` / MongoDB: `#47a248` / Redis: `#dc382d` / Firebase: `#ff6818`

**その他:**
- Git: `#f05032` / Linux: `#fcc624` / GraphQL: `#e10098` / REST: `#0d9488` (デフォルトティール)

未登録スキルはデフォルトのティール色（`#0d9488`）を使用。

### API

```typescript
function getSkillColor(skillName: string): { bg: string; text: string; border: string }
```

- `bg`: 背景色（ブランドカラーの 13% 不透明度）
- `text`: テキスト色（ブランドカラーのダーク版）
- `border`: ボーダー色（ブランドカラーの 27% 不透明度）

## SkillBadge コンポーネント

`src/components/ui/skill-badge.tsx`

```
<SkillBadge name="React" />
→ ブランドカラーの淡い背景 + テキスト + ボーダーの pill バッジ
```

### Props

| Prop | 型 | 説明 |
|------|----|------|
| name | string | スキル名（カラーマップのキー） |

### 使用箇所

- エンジニア一覧テーブル（`src/app/(dashboard)/engineers/_components/engineer-table.tsx`）
- エンジニア詳細（`src/app/(dashboard)/engineers/_components/`）
- 案件一覧テーブル（`src/app/(dashboard)/projects/_components/project-table.tsx`）
- 案件詳細（`src/app/(dashboard)/projects/_components/project-detail.tsx`）
- マッチング案件選択画面（`src/app/(dashboard)/matching/page.tsx`）
- マッチング結果画面（`src/app/(dashboard)/matching/[projectId]/page.tsx`）

## ファイル構成

```
新規作成:
  src/lib/skill-colors.ts           — スキルカラーマップ + getSkillColor
  src/lib/skill-colors.test.ts      — テスト
  src/components/ui/skill-badge.tsx  — SkillBadge コンポーネント
  src/components/ui/skill-badge.test.tsx — テスト

修正:
  src/app/globals.css                — テーマカラー変更
  src/app/(dashboard)/engineers/_components/engineer-table.tsx
  src/app/(dashboard)/projects/_components/project-table.tsx
  src/app/(dashboard)/projects/_components/project-detail.tsx
  src/app/(dashboard)/matching/page.tsx
  src/app/(dashboard)/matching/[projectId]/page.tsx
```

## テスト方針

- **skill-colors**: `getSkillColor("React")` が正しい色を返すか、未登録スキルがデフォルト色を返すか
- **SkillBadge**: レンダリング確認、スキル名の表示、色スタイルの適用
