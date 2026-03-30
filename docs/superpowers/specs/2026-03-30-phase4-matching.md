# Phase 4: マッチング 設計書

## 概要

案件に対してエンジニアをAIマッチングする機能を構築する。pgvector による高速な類似検索で候補を絞り込み、Claude で詳細評価（5軸スコア + 評価理由）を行う。Phase 2/3 で蓄積した Embedding データを活用する。

## スコープ

- マッチング案件選択画面（`/matching`）
- マッチング実行（pgvector 類似検索 → Claude 詳細評価）
- マッチング結果画面（`/matching/[projectId]`）— カード型リスト
- 案件詳細画面（`/projects/[id]`）にマッチング実行ボタン追加
- マッチング再実行（既存結果を完全上書き）

### スコープ外

- 提案書生成（Phase 5）
- プログレス表示・ストリーミング UI
- マッチング候補件数のユーザー設定
- マッチング履歴の保持

## マッチングパイプライン

```
1. ユーザーが案件を選択し「マッチング実行」ボタンを押す
   ↓
2. pgvector で案件の embedding と全エンジニアの embedding を cosine 類似度で比較
   → 同一 org_id のエンジニアのみ対象（RLS）
   → 上位10件を抽出
   ↓
3. 10件のエンジニアを Claude で個別に詳細評価（Promise.all で並列実行）
   → 案件情報 + エンジニア情報を入力
   → 5軸スコア + 総合スコア + 評価理由を構造化出力
   ↓
4. 既存の matches（同一 project_id）を DELETE
   → 新しい10件の結果を INSERT
   ↓
5. /matching/[projectId] へリダイレクト
```

### 評価項目（5軸）

| 項目 | フィールド | 説明 |
|------|-----------|------|
| 技術スキル | skill_score | 言語・フレームワーク・ツールの一致度 |
| 経験年数 | experience_score | 該当技術や業界での経験年数 |
| 業界・ドメイン | industry_score | 金融、医療、EC など業界知識の一致 |
| 稼働条件 | condition_score | 単価、稼働時期、リモート可否、勤務地 |
| ソフトスキル | soft_skill_score | リーダー経験、コミュニケーション、マネジメント |

- 各項目: 0〜100 の整数
- 総合スコア（overall_score）: Claude が5軸を総合的に判断して算出（単純平均ではない）
- 評価理由（ai_reasoning）: 日本語で3〜5文程度

### pgvector 類似検索

Supabase の RPC（SQL function）として実装する。

```sql
CREATE OR REPLACE FUNCTION match_engineers(
  query_embedding vector(1536),
  match_org_id uuid,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  skills jsonb,
  experience_years int,
  industries text[],
  availability jsonb,
  soft_skills jsonb,
  raw_text text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.name,
    e.skills,
    e.experience_years,
    e.industries,
    e.availability,
    e.soft_skills,
    e.raw_text,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM engineers e
  WHERE e.org_id = match_org_id
    AND e.embedding IS NOT NULL
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### Claude 詳細評価

`generateText` + `Output.object({ schema })` で構造化出力。

**入力:**
- 案件情報（タイトル、要求スキル、経験年数、業界、条件、説明文）
- エンジニア情報（名前、スキル、経験年数、業界、稼働条件、ソフトスキル）

**出力スキーマ（Zod）:**

```typescript
const matchEvaluationSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  skill_score: z.number().int().min(0).max(100),
  experience_score: z.number().int().min(0).max(100),
  industry_score: z.number().int().min(0).max(100),
  condition_score: z.number().int().min(0).max(100),
  soft_skill_score: z.number().int().min(0).max(100),
  ai_reasoning: z.string(),
})
```

**プロンプト方針:**
- 案件の要件とエンジニアのプロフィールを比較評価するよう指示
- 各スコアの評価基準を明示（例: 技術スキルは要求スキルとの一致度・レベル・年数を考慮）
- 総合スコアは単純平均ではなく、案件の重点に応じて重み付けするよう指示
- 評価理由は日本語で、具体的な根拠を含めるよう指示

## 画面構成

### マッチング案件選択画面（`/matching`）

- open ステータスの案件をカード形式で表示
- マッチング済みの案件には最新の実行日時とマッチ件数を表示
- 各カードに「マッチング実行」ボタンと「結果を見る」リンク（マッチング済みの場合）
- テキスト検索（タイトル・クライアント名）

### マッチング結果画面（`/matching/[projectId]`）

- 上部に案件情報のサマリー（タイトル、クライアント名、要求スキル）
- 「再実行」ボタン
- カード型リストでエンジニアを総合スコア降順に表示

**カード構成:**
- エンジニア名、主要スキル、経験年数
- 総合スコア（色分け: 80+ 緑、60-79 黄、60未満 赤）
- 項目別スコアのバッジ（5つ）
- AI評価理由（展開/折りたたみ）
- エンジニア詳細へのリンク

### 案件詳細への追加（`/projects/[id]`）

- 既存の案件詳細画面に「マッチング実行」ボタンを追加
- マッチング済みの場合は「マッチング結果を見る」リンクも表示
- ボタン押下で Server Action 実行 → `/matching/[projectId]` へリダイレクト

### ローディング

- マッチング実行中はシンプルなスピナーを表示
- 「マッチング実行中...」のテキスト付き
- Server Action 完了後に結果画面へリダイレクト

## ファイル構成

```
src/
├── actions/
│   └── matching.ts              ← Server Actions（実行・取得・削除）
├── app/(dashboard)/
│   ├── matching/
│   │   ├── page.tsx             ← 案件選択画面
│   │   └── [projectId]/
│   │       └── page.tsx         ← マッチング結果画面
│   └── projects/
│       └── [id]/
│           └── page.tsx         ← 既存（マッチングボタン追加）
├── components/
│   └── matching/
│       ├── matching-card.tsx    ← マッチング結果カード
│       ├── project-select-card.tsx  ← 案件選択カード
│       └── execute-button.tsx   ← マッチング実行ボタン（loading状態管理）
├── lib/
│   └── ai/
│       ├── schemas.ts           ← 既存（matchEvaluationSchema 追加）
│       └── prompts.ts           ← 既存（マッチング評価プロンプト追加）
└── types/
    └── index.ts                 ← 既存（Match 型は定義済み）

supabase/
└── migrations/
    └── 004_match_engineers_function.sql  ← pgvector 検索用 RPC
```

## Server Actions

### `executeMatching(projectId: string)`

1. 認証チェック + org_id 取得
2. 案件を取得（embedding 含む）。embedding が null の場合はエラー
3. `match_engineers` RPC で上位10件取得
4. 候補が0件の場合はエラーメッセージを返す
5. 10件を `Promise.all` で Claude 詳細評価
6. 既存 matches（同一 project_id）を DELETE
7. 新しい結果を INSERT
8. `revalidatePath` で `/matching` と `/matching/[projectId]` を無効化
9. `/matching/[projectId]` へ redirect

### `getMatchResults(projectId: string)`

1. 認証チェック + org_id 取得
2. matches テーブルから project_id で検索（overall_score 降順）
3. engineer 情報を join して返す

## エラーハンドリング

| シーン | 対応 |
|--------|------|
| 案件の embedding が null | 「案件の Embedding が未生成です。案件を編集して保存し直してください」 |
| マッチング候補が0件 | 「条件に合うエンジニアが見つかりませんでした。エンジニアを登録してください」 |
| Claude API エラー | 該当エンジニアをスキップし、成功した結果のみ保存。エラー件数を通知 |
| DB エラー | エラーメッセージを返す |

## テスト方針

- **Server Actions**: `executeMatching` のロジック（認証チェック、バリデーション、エラーケース）
- **Zod スキーマ**: `matchEvaluationSchema` のバリデーション
- **コンポーネント**: マッチングカードのレンダリング、スコア色分け、展開/折りたたみ
- **プロンプト生成**: エンジニア/案件情報からプロンプトテキストを正しく組み立てるか
