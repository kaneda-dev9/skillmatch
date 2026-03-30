# Phase 5: 提案書生成 設計書

## 概要

マッチング結果からエンジニアの提案書を AI で自動生成する機能を構築する。Claude の `streamText` でリアルタイムにストリーミング表示し、生成後に編集・PDF ダウンロード・コピーが可能。

## スコープ

- マッチング結果カードに「提案書生成」ボタン追加
- 提案書生成画面（`/proposals/new?matchId=xxx`）— ストリーミング + 2カラムレイアウト
- 提案書詳細画面（`/proposals/[id]`）— プレビュー・編集・PDF ダウンロード・コピー
- 提案書一覧画面（`/proposals`）— テーブル形式
- Server Actions（保存・更新・削除・取得）

### スコープ外

- テンプレート選択（将来拡張）
- 編集履歴・バージョン管理
- 提案書の共有リンク
- 英語版テンプレート

## 提案書生成パイプライン

```
1. マッチング結果カードの「提案書生成」ボタンを押す
   ↓
2. /proposals/new?matchId=xxx に遷移
   ↓
3. クライアントから Route Handler (POST /api/proposals/generate) にリクエスト
   → matchId を送信
   → サーバーで match + engineer + project の情報を取得
   ↓
4. Claude streamText で提案書を定型フォーマットで生成
   → クライアントにストリーミングレスポンス
   → 左カラムにリアルタイム Markdown プレビュー
   ↓
5. 生成完了 → 右カラムのエディタが有効に
   → ユーザーが Markdown を直接編集可能
   ↓
6. 「保存」ボタン → Server Action で proposals テーブルに INSERT
   → /proposals/[id] へリダイレクト
```

## 提案書フォーマット（定型）

Claude に以下の固定セクション構成で生成させる:

```markdown
# 候補者ご提案書

## 候補者概要
- 氏名、経験年数、主要スキルの要約

## スキルマッチ度
- 総合スコアと項目別スコアの表
- 各スコアの簡潔な説明

## 推薦理由
- 案件要件とエンジニアのスキル・経験の具体的な合致点
- なぜこの候補者が最適かの根拠（3〜5段落）

## 稼働条件
- 単価、稼働開始日、リモート可否、勤務地
- 案件条件との適合状況
```

プロンプトには案件情報、エンジニア情報、マッチングスコア、AI 評価理由を全て含める。

## 画面構成

### 提案書生成画面（`/proposals/new?matchId=xxx`）

Client Component。2カラムレイアウト。

**左カラム（プレビュー）:**
- 生成中: Markdown をリアルタイムにレンダリング表示（react-markdown）
- 生成完了: 完成した提案書のプレビュー

**右カラム（エディタ）:**
- 生成中: 無効状態（グレーアウト）
- 生成完了: テキストエリアで Markdown を直接編集可能
- 編集内容は左カラムのプレビューにリアルタイム反映

**アクションバー（右カラム下部）:**
- 「保存」ボタン — proposals テーブルに INSERT
- 「PDF ダウンロード」ボタン — クライアントサイドで PDF 生成
- 「コピー」ボタン — Markdown テキストをクリップボードにコピー

**ヘッダー:**
- 戻るボタン（マッチング結果画面へ）
- 案件名 + エンジニア名

### 提案書詳細画面（`/proposals/[id]`）

生成画面と同じ2カラムレイアウトを再利用。ただしストリーミングなし。

- 左カラム: 保存済み Markdown のプレビュー表示
- 右カラム: テキストエリアで編集可能
- アクションバー: 「更新」「PDF ダウンロード」「コピー」「削除」

### 提案書一覧画面（`/proposals`）

テーブル形式。Phase 2/3 の一覧画面と同じパターン。

| カラム | 内容 |
|--------|------|
| 案件名 | match → project の title |
| エンジニア名 | match → engineer の name |
| 生成日時 | created_at |
| 操作 | 詳細リンク |

### マッチング結果カードへの追加

`src/components/matching/matching-card.tsx` の AI 評価セクションの下に「提案書生成」ボタンを追加。

- 提案書未生成: 「提案書を生成」ボタン → `/proposals/new?matchId=xxx` へ遷移
- 提案書生成済み: 「提案書を見る」リンク → `/proposals/[id]` へ遷移

## ファイル構成

```
新規作成:
  src/app/api/proposals/generate/route.ts    — ストリーミング Route Handler
  src/actions/proposals.ts                   — Server Actions（CRUD）
  src/lib/ai/proposal.ts                     — 提案書生成プロンプト
  src/lib/ai/proposal.test.ts                — プロンプト生成テスト
  src/app/(dashboard)/proposals/page.tsx     — 一覧画面
  src/app/(dashboard)/proposals/[id]/page.tsx — 詳細画面
  src/app/(dashboard)/proposals/new/page.tsx — 生成画面
  src/components/proposals/proposal-editor.tsx — 2カラムエディタ（プレビュー + 編集）
  src/components/proposals/proposal-editor.test.tsx — エディタテスト
  src/components/proposals/pdf-download-button.tsx — PDF ダウンロードボタン

修正:
  src/components/matching/matching-card.tsx   — 提案書生成ボタン追加

新規パッケージ:
  react-markdown                             — Markdown → HTML レンダリング
  html2pdf.js                                — HTML → PDF 変換（クライアントサイド）
```

## Route Handler（ストリーミング）

`src/app/api/proposals/generate/route.ts`

```
POST /api/proposals/generate
Body: { matchId: string }

1. 認証チェック
2. matchId から match + engineer + project を取得
3. streamText で Claude に提案書を生成させる
4. ストリーミングレスポンスを返す（AI SDK の toDataStreamResponse()）
```

Vercel AI SDK 6 の `streamText` + `toDataStreamResponse()` パターンを使用。クライアント側は `useCompletion` フックで受信する。

## Server Actions

### `saveProposal(matchId: string, content: string)`

1. 認証チェック + org_id 取得
2. proposals テーブルに INSERT（format: "markdown"）
3. `revalidatePath("/proposals")`
4. 生成された proposal の id を返す

### `updateProposal(id: string, content: string)`

1. 認証チェック
2. proposals テーブルを UPDATE
3. `revalidatePath` で無効化

### `deleteProposal(id: string)`

1. 認証チェック
2. proposals テーブルから DELETE
3. `revalidatePath("/proposals")`
4. `/proposals` へ redirect

### `getProposal(id: string)`

1. 認証チェック
2. proposals テーブルから取得（match → engineer, project を join）

## エラーハンドリング

| シーン | 対応 |
|--------|------|
| match が存在しない | 「マッチング結果が見つかりません」エラー表示 |
| Claude API エラー | 「提案書の生成に失敗しました。再試行してください」 |
| 保存失敗 | エラーメッセージ表示。テキストエリアの内容は保持 |
| 既に提案書が存在する match | 上書き確認なしで新規作成（同じ match に複数提案書可） |

## テスト方針

- **プロンプト生成**: 案件・エンジニア・マッチング情報からプロンプトが正しく組み立てられるか
- **Server Actions**: 保存・更新・削除の関数が定義されているか
- **コンポーネント**: エディタのプレビュー/編集切り替え、コピーボタン
- **PDF ダウンロード**: ボタンの存在確認（実際の PDF 生成はブラウザ依存のため E2E で対応）
