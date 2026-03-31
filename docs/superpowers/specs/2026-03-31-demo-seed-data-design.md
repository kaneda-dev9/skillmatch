# デモデータ投入機能 設計書

## 概要

ダッシュボードに「デモデータを投入」ボタンを配置。エンジニア9名＋案件6件をワンクリックで一括登録し、Embedding も生成してマッチングまで即試せる状態にする。ポートフォリオとして採用担当が機能を試しやすくする目的。

## アーキテクチャ

Server Action `seedDemoData()` が認証・org_id 取得後、デモデータを insert し、Embedding を並列生成して update する。削除機能は不要（通常の個別削除で対応）。

## ファイル構成

- `src/actions/seed.ts` — Server Action + デモデータ定義
- `src/components/dashboard/seed-demo-button.tsx` — クライアントコンポーネント（ボタン + 確認ダイアログ + ローディング）
- `src/app/(dashboard)/dashboard/page.tsx` — ボタン配置（ヘッダー右）

## デモデータ

### エンジニア（9名）

| 名前 | スキル | 経験年数 | 業界 | リモート | 所在地 |
|------|--------|---------|------|---------|--------|
| 田中太郎 | React(上級/5年), TypeScript(上級/5年), Next.js(中級/3年) | 8年 | EC, SaaS | true | 東京 |
| 鈴木花子 | Python(エキスパート/10年), AWS(上級/8年), Docker(中級/4年) | 12年 | 金融, ヘルスケア | true | 大阪 |
| 佐藤健一 | React(中級/3年), Node.js(上級/5年), PostgreSQL(上級/5年) | 6年 | SaaS, 教育 | true | リモート |
| 山田美咲 | AWS(エキスパート/9年), Terraform(上級/6年), Kubernetes(上級/5年) | 10年 | 金融, 製造 | false | 東京 |
| 高橋優太 | Java(エキスパート/13年), Spring Boot(上級/8年), Oracle(中級/5年) | 15年 | 金融, 保険 | false | 名古屋 |
| 中村あかり | Figma(上級/4年), React(中級/3年), CSS(エキスパート/5年) | 5年 | EC, メディア | true | 福岡 |
| 伊藤大輝 | Go(上級/5年), gRPC(中級/3年), Kubernetes(中級/3年) | 7年 | 通信, SaaS | true | 東京 |
| 渡辺理沙 | Flutter(上級/3年), Dart(上級/3年), Firebase(中級/2年) | 4年 | ヘルスケア, 教育 | true | リモート |
| 木村拓真 | PHP(エキスパート/9年), Laravel(上級/7年), MySQL(上級/6年) | 9年 | EC, 不動産 | false | 大阪 |

### 案件（6件）

| タイトル | クライアント | 必要スキル | 経験年数 | 業界 | リモート |
|---------|-------------|-----------|---------|------|---------|
| EC サイトリニューアル | ABC商事 | React(上級/4年), TypeScript(中級/3年), Next.js(中級/2年) | 5年 | EC | true |
| 金融系 API 基盤構築 | XYZ銀行 | Python(上級/5年), AWS(中級/3年), Docker(中級/2年) | 7年 | 金融 | false |
| クラウドインフラ移行 | DEF製造 | AWS(上級/5年), Terraform(中級/3年), Kubernetes(中級/2年) | 8年 | 製造 | false |
| 保険業務システム刷新 | GHI保険 | Java(上級/8年), Spring Boot(中級/4年), Oracle(中級/3年) | 10年 | 保険 | false |
| メディアサイト新規構築 | JKLメディア | React(中級/2年), CSS(上級/3年), Figma(初級/1年) | 3年 | メディア | true |
| マイクロサービス基盤開発 | MNO通信 | Go(上級/4年), gRPC(中級/2年), Kubernetes(中級/2年) | 5年 | 通信 | true |

### ソフトスキル（エンジニアに割り当て）

各エンジニアに 2〜3 個のソフトスキルを割り当てる（リーダーシップ、コミュニケーション、問題解決力、チームワーク、メンタリング、プレゼン力、ドキュメンテーション）。

## UI の振る舞い

1. ダッシュボードのヘッダー右に「デモデータを投入」ボタン
2. クリック時に確認ダイアログ表示（「デモ用のエンジニア9名と案件6件を登録します。よろしいですか？」）
3. 投入中はボタンがローディング状態
4. Embedding 生成は並列実行（Promise.allSettled）。一部失敗しても投入自体は成功
5. 完了後 `revalidatePath` でダッシュボードのカウントを更新
6. 成功時にトースト or メッセージ表示

## Server Action フロー

```
seedDemoData()
  → 認証チェック + org_id 取得
  → エンジニア9名を一括 insert → ID 取得
  → エンジニア Embedding を並列生成 → 各 update
  → 案件6件を一括 insert → ID 取得
  → 案件 Embedding を並列生成 → 各 update
  → revalidatePath("/dashboard", "/engineers", "/projects")
```

## 設計判断

- **削除機能は不要**: 通常の個別削除操作で対応。シンプルに保つ
- **Embedding 生成あり**: 投入後すぐにマッチングを試せる UX を優先
- **デモデータは actions/seed.ts 内にハードコード**: 別ファイルに分ける必要のない規模
