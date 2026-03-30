# Phase 4: マッチング機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 案件に対してエンジニアを pgvector + Claude でマッチングし、5軸スコア付きの結果をカード型リス���で表示する

**Architecture:** Server Action でマッチングパイプラインを実行。pgvector RPC で候補抽出 → Claude 個別評価（並列）→ matches テーブルに保存。結果画面はカード型リスト。案件詳細からもマッチング実行可能。

**Tech Stack:** Next.js 16 (App Router), Vercel AI SDK 6, Supabase (pgvector), Claude claude-sonnet-4-6, Zod, shadcn/ui, Vitest

---

## ファイル構成

```
新規作成:
  supabase/migrations/004_match_engineers_function.sql  — pgvector 検索用 RPC
  src/lib/ai/matching.ts                               — マッチング評価ロジック（プロンプト + スキーマ）
  src/lib/ai/matching.test.ts                          — マッ���ング評価のテスト
  src/actions/matching.ts                              — Server Actions
  src/actions/matching.test.ts                         — Server Actions のテスト
  src/components/matching/matching-card.tsx             — 結果カードコンポーネント
  src/components/matching/matching-card.test.tsx        — カードのテスト
  src/components/matching/execute-button.tsx            — マッチング実行ボタン（loading 管理）
  src/components/matching/execute-button.test.tsx       — ボタンのテスト
  src/app/(dashboard)/matching/page.tsx                — 案件選択画面
  src/app/(dashboard)/matching/[projectId]/page.tsx    — 結果画面

修正:
  src/lib/validations/shared.ts                        — matchEvaluationSchema 追加
  src/app/(dashboard)/projects/[id]/page.tsx           — マッチングボタン追加
```

---

### Task 1: pgvector 検索用 SQL function を作成

**Files:**
- Create: `supabase/migrations/004_match_engineers_function.sql`

- [ ] **Step 1: マイグレーションファイルを作成**

```sql
-- pgvector cosine 類似度でエンジニアを検索する RPC
CREATE OR REPLACE FUNCTION match_engineers(
  query_embedding vector(1536),
  match_org_id uuid,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
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
    e.email,
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

- [ ] **Step 2: Supabase にマイグレーションを適用**

MCP ツール `mcp__claude_ai_Supabase__apply_migration` を使用してマイグ���ーションを適用する。

- [ ] **Step 3: コミット**

```bash
git add supabase/migrations/004_match_engineers_function.sql
git commit -m "feat: pgvector 検索用 match_engineers RPC を追加"
```

---

### Task 2: マッチング評��スキーマを追加

**Files:**
- Modify: `src/lib/validations/shared.ts`
- Test: `src/lib/validations/shared.test.ts`

- [ ] **Step 1: テストを書く**

`src/lib/validations/shared.test.ts` に追加:

```typescript
describe("matchEvaluationSchema", () => {
  it("有効な評価結果を通す", () => {
    const result = matchEvaluationSchema.safeParse({
      overall_score: 85,
      skill_score: 90,
      experience_score: 80,
      industry_score: 75,
      condition_score: 88,
      soft_skill_score: 82,
      ai_reasoning: "React/TypeScript の実務経験が豊富で、即戦力として期待できる。",
    })
    expect(result.success).toBe(true)
  })

  it("スコアが 0-100 の範囲外の場合に拒否する", () => {
    const result = matchEvaluationSchema.safeParse({
      overall_score: 101,
      skill_score: 90,
      experience_score: 80,
      industry_score: 75,
      condition_score: 88,
      soft_skill_score: 82,
      ai_reasoning: "テスト",
    })
    expect(result.success).toBe(false)
  })

  it("ai_reasoning が空文字の場合に拒否する", () => {
    const result = matchEvaluationSchema.safeParse({
      overall_score: 85,
      skill_score: 90,
      experience_score: 80,
      industry_score: 75,
      condition_score: 88,
      soft_skill_score: 82,
      ai_reasoning: "",
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm run test src/lib/validations/shared.test.ts`
Expected: FAIL — `matchEvaluationSchema` が未定義

- [ ] **Step 3: スキーマを実装**

`src/lib/validations/shared.ts` に追加:

```typescript
const scoreField = z.number().int().min(0).max(100)

export const matchEvaluationSchema = z.object({
  overall_score: scoreField,
  skill_score: scoreField,
  experience_score: scoreField,
  industry_score: scoreField,
  condition_score: scoreField,
  soft_skill_score: scoreField,
  ai_reasoning: z.string().min(1),
})

export type MatchEvaluation = z.infer<typeof matchEvaluationSchema>
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm run test src/lib/validations/shared.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/validations/shared.ts src/lib/validations/shared.test.ts
git commit -m "feat: マッチング評価用 Zod スキーマを追加"
```

---

### Task 3: マッチング評価ロジック（プロンプト + Claude 呼び出し）

**Files:**
- Create: `src/lib/ai/matching.ts`
- Test: `src/lib/ai/matching.test.ts`

- [ ] **Step 1: プロンプト生成のテストを書く**

`src/lib/ai/matching.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { buildMatchingPrompt } from "./matching"

describe("buildMatchingPrompt", () => {
  const project = {
    title: "ECサイトリプレイス",
    client_name: "株式会社テスト",
    required_skills: [
      { name: "React", level: "advanced" as const, years: 3 },
      { name: "TypeScript", level: "intermediate" as const, years: 2 },
    ],
    experience_years: 5,
    industries: ["EC", "金融"],
    conditions: {
      rate_min: 600000,
      rate_max: 900000,
      start_date: null,
      remote: true,
      location: null,
    },
    description: "ECサイトのフロントエ���ド刷新プロジェクト",
  }

  const engineer = {
    name: "田中太郎",
    skills: [
      { name: "React", level: "expert" as const, years: 8 },
      { name: "TypeScript", level: "advanced" as const, years: 5 },
    ],
    experience_years: 10,
    industries: ["EC", "金融"],
    availability: {
      rate_min: 500000,
      rate_max: 800000,
      start_date: null,
      remote: true,
      location: null,
    },
    soft_skills: [{ name: "リーダーシップ", description: null }],
  }

  it("案件情報がプロンプトに含まれる", () => {
    const prompt = buildMatchingPrompt(project, engineer)
    expect(prompt).toContain("ECサイトリプレイス")
    expect(prompt).toContain("React")
    expect(prompt).toContain("TypeScript")
    expect(prompt).toContain("EC")
  })

  it("エンジニア情報がプロンプトに含まれる", () => {
    const prompt = buildMatchingPrompt(project, engineer)
    expect(prompt).toContain("田中太郎")
    expect(prompt).toContain("expert")
    expect(prompt).toContain("リーダーシップ")
  })

  it("評価基準の指示が含まれる", () => {
    const prompt = buildMatchingPrompt(project, engineer)
    expect(prompt).toContain("技術スキル")
    expect(prompt).toContain("経験年数")
    expect(prompt).toContain("業界")
    expect(prompt).toContain("稼働条件")
    expect(prompt).toContain("ソフトスキル")
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm run test src/lib/ai/matching.test.ts`
Expected: FAIL — `buildMatchingPrompt` が未定義

- [ ] **Step 3: マッチングロジックを実装**

`src/lib/ai/matching.ts`:

```typescript
import { generateText, Output } from "ai"
import type { Skill, SoftSkill, Availability } from "@/types"
import { matchEvaluationSchema } from "@/lib/validations/shared"
import type { MatchEvaluation } from "@/lib/validations/shared"
import { llm } from "./provider"

interface ProjectForMatching {
  title: string
  client_name: string
  required_skills: Skill[]
  experience_years: number
  industries: string[]
  conditions: Availability
  description: string
}

interface EngineerForMatching {
  name: string
  skills: Skill[]
  experience_years: number
  industries: string[]
  availability: Availability
  soft_skills: SoftSkill[]
}

function formatSkills(skills: Skill[]): string {
  return skills.map((s) => `${s.name}（${s.level}・${s.years}年）`).join(", ")
}

function formatAvailability(a: Availability): string {
  const parts: string[] = []
  if (a.rate_min || a.rate_max) parts.push(`単価: ${a.rate_min ?? "?"}〜${a.rate_max ?? "?"}円`)
  if (a.start_date) parts.push(`稼働開始: ${a.start_date}`)
  parts.push(`リモート: ${a.remote ? "可" : "不可"}`)
  if (a.location) parts.push(`勤務地: ${a.location}`)
  return parts.join(", ")
}

export function buildMatchingPrompt(
  project: ProjectForMatching,
  engineer: EngineerForMatching,
): string {
  return `あなたはエンジニアマッチングの専門家です。以下の案件とエンジニアを比較し、��ッチング評価を行ってください。

## 案件情報
- タイトル: ${project.title}
- クライアント: ${project.client_name}
- 要求スキル: ${formatSkills(project.required_skills)}
- 必要経験年数: ${project.experience_years}年
- 業界: ${project.industries.join(", ") || "指定なし"}
- 稼働条件: ${formatAvailability(project.conditions)}
- 説明: ${project.description || "なし"}

## エンジニア情報
- 名前: ${engineer.name}
- スキル: ${formatSkills(engineer.skills)}
- 経験年数: ${engineer.experience_years}年
- 業界経験: ${engineer.industries.join(", ") || "なし"}
- 稼働条件: ${formatAvailability(engineer.availability)}
- ソフトスキル: ${engineer.soft_skills.map((s) => s.name).join(", ") || "なし"}

## ��価基準
以下の5軸で 0〜100 のスコアを付けてください:

1. **技術スキル (skill_score)**: 要求スキルとの一致度。スキル名・レベル・経験年数を考慮
2. **経験年数 (experience_score)**: 必要経験年数との比較。関連技術での経験を重視
3. **業界・ドメイン (industry_score)**: 案件の業��と過去の業界経験の一致度
4. **稼働条件 (condition_score)**: 単価レンジ、リモート可否、勤務地��稼働時期の適合度
5. **ソフトスキル (soft_skill_score)**: リーダーシップ、コミュニケーション等の適合度

**総合スコア (overall_score)** は単純平均ではなく、案件の要件に応じて重要な項目に重み付けして総合的に判断してください。

**評価理由 (ai_reasoning)** は日本語で3〜5文程度。具体的な根拠（どのスキルが一致、どの経験が活かせるか等）を��めてください。`
}

export async function evaluateEngineer(
  project: ProjectForMatching,
  engineer: EngineerForMatching,
): Promise<MatchEvaluation> {
  const prompt = buildMatchingPrompt(project, engineer)

  const result = await generateText({
    model: llm,
    output: Output.object({ schema: matchEvaluationSchema }),
    messages: [{ role: "user", content: prompt }],
  })

  return result.output
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm run test src/lib/ai/matching.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/ai/matching.ts src/lib/ai/matching.test.ts
git commit -m "feat: マッチング評価ロジック（プロンプト生成 + Claude 呼び出し）を追加"
```

---

### Task 4: Server Actions（マッチ���グ実行 + 結果取得）

**Files:**
- Create: `src/actions/matching.ts`
- Test: `src/actions/matching.test.ts`

- [ ] **Step 1: Server Actions のテストを書く**

`src/actions/matching.test.ts`:

```typescript
import { describe, expect, it } from "vitest"

describe("matching actions", () => {
  it("モジュールがエクスポートされている", async () => {
    const mod = await import("./matching")
    expect(mod.executeMatching).toBeDefined()
    expect(mod.getMatchResults).toBeDefined()
    expect(typeof mod.executeMatching).toBe("function")
    expect(typeof mod.getMatchResults).toBe("function")
  })
})
```

注意: Server Actions は Supabase 認証・DB 接続が必要なため、ユニットテ���トでは関数の存在確認のみ行う。統合テストは E2E で対応。

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm run test src/actions/matching.test.ts`
Expected: FAIL — モジュールが存在しない

- [ ] **Step 3: Server Actions を実装**

`src/actions/matching.ts`:

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { evaluateEngineer } from "@/lib/ai/matching"
import { createClient } from "@/lib/supabase/server"
import type { Project, Engineer } from "@/types"

export async function executeMatching(projectId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { data: profile } = await supabase.from("users").select("org_id").eq("id", user.id).single()
  if (!profile) return { error: "ユーザープロフィールが見つかりません" }

  // 案件を取得
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single()

  if (!project) return { error: "案件が見つかりません" }
  if (!project.embedding) {
    return { error: "案件の Embedding が未生成です。案件を編集して保存し直してください。" }
  }

  // pgvector で上位10件のエンジニアを取得
  const { data: candidates, error: rpcError } = await supabase.rpc("match_engineers", {
    query_embedding: project.embedding,
    match_org_id: profile.org_id,
    match_count: 10,
  })

  if (rpcError) return { error: rpcError.message }
  if (!candidates || candidates.length === 0) {
    return { error: "条件に合うエンジニアが見つかりませんでした。エンジニアを登録してください。" }
  }

  // Claude で個別評価（並列実行）
  const projectForEval = {
    title: project.title,
    client_name: project.client_name,
    required_skills: project.required_skills as Project["required_skills"],
    experience_years: project.experience_years,
    industries: project.industries,
    conditions: project.conditions as Project["conditions"],
    description: project.description,
  }

  const evaluations = await Promise.allSettled(
    candidates.map((engineer: Engineer) =>
      evaluateEngineer(projectForEval, {
        name: engineer.name,
        skills: engineer.skills as Engineer["skills"],
        experience_years: engineer.experience_years,
        industries: engineer.industries,
        availability: engineer.availability as Engineer["availability"],
        soft_skills: engineer.soft_skills as Engineer["soft_skills"],
      }).then((evaluation) => ({
        engineer_id: engineer.id,
        evaluation,
      })),
    ),
  )

  const successfulResults = evaluations
    .filter((r): r is PromiseFulfilledResult<{ engineer_id: string; evaluation: Awaited<ReturnType<typeof evaluateEngineer>> }> => r.status === "fulfilled")
    .map((r) => r.value)

  if (successfulResults.length === 0) {
    return { error: "マッチング評価に失敗しました。しばらく待ってから再試行してください。" }
  }

  // 既存結果を削除
  await supabase.from("matches").delete().eq("project_id", projectId)

  // 新���い結果を挿入
  const matchRows = successfulResults.map((r) => ({
    org_id: profile.org_id,
    project_id: projectId,
    engineer_id: r.engineer_id,
    overall_score: r.evaluation.overall_score,
    skill_score: r.evaluation.skill_score,
    experience_score: r.evaluation.experience_score,
    industry_score: r.evaluation.industry_score,
    condition_score: r.evaluation.condition_score,
    soft_skill_score: r.evaluation.soft_skill_score,
    ai_reasoning: r.evaluation.ai_reasoning,
  }))

  const { error: insertError } = await supabase.from("matches").insert(matchRows)
  if (insertError) return { error: insertError.message }

  const failedCount = evaluations.length - successfulResults.length
  if (failedCount > 0) {
    // 一部失敗があった場合は通知だけして結果画面に進む
    revalidatePath("/matching")
    revalidatePath(`/matching/${projectId}`)
    redirect(`/matching/${projectId}`)
  }

  revalidatePath("/matching")
  revalidatePath(`/matching/${projectId}`)
  redirect(`/matching/${projectId}`)
}

export async function getMatchResults(projectId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "認証が必要です" }

  const { data, error } = await supabase
    .from("matches")
    .select("*, engineer:engineers(*)")
    .eq("project_id", projectId)
    .order("overall_score", { ascending: false })

  if (error) return { data: null, error: error.message }

  return { data, error: null }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm run test src/actions/matching.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/actions/matching.ts src/actions/matching.test.ts
git commit -m "feat: マッチング実行��結果取得の Server Actions を追加"
```

---

### Task 5: マッチング結果カードコンポーネント

**Files:**
- Create: `src/components/matching/matching-card.tsx`
- Test: `src/components/matching/matching-card.test.tsx`

- [ ] **Step 1: テストを書く**

`src/components/matching/matching-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { MatchingCard } from "./matching-card"

const mockMatch = {
  id: "1",
  overall_score: 87,
  skill_score: 92,
  experience_score: 85,
  industry_score: 80,
  condition_score: 90,
  soft_skill_score: 88,
  ai_reasoning: "React/TypeScript の実務経験が豊富で、即戦力として期待できる。",
  engineer: {
    id: "e1",
    name: "田中太郎",
    skills: [
      { name: "React", level: "expert", years: 8 },
      { name: "TypeScript", level: "advanced", years: 5 },
    ],
    experience_years: 10,
  },
}

describe("MatchingCard", () => {
  it("エンジニア名と総合スコアを表示する", () => {
    render(<MatchingCard match={mockMatch} />)
    expect(screen.getByText("田中太郎")).toBeDefined()
    expect(screen.getByText("87")).toBeDefined()
  })

  it("項目別スコアをバッジで表示する", () => {
    render(<MatchingCard match={mockMatch} />)
    expect(screen.getByText("技術 92")).toBeDefined()
    expect(screen.getByText("経験 85")).toBeDefined()
    expect(screen.getByText("業界 80")).toBeDefined()
    expect(screen.getByText("条件 90")).toBeDefined()
    expect(screen.getByText("ソフト 88")).toBeDefined()
  })

  it("スコア80以上で緑色のスタイルを適用する", () => {
    render(<MatchingCard match={mockMatch} />)
    const scoreEl = screen.getByText("87")
    expect(scoreEl.className).toContain("bg-green")
  })

  it("スコア60-79で黄色のスタイルを適用する", () => {
    const match = { ...mockMatch, overall_score: 74 }
    render(<MatchingCard match={match} />)
    const scoreEl = screen.getByText("74")
    expect(scoreEl.className).toContain("bg-yellow")
  })

  it("スコア60未満で赤色のスタイルを適用する", () => {
    const match = { ...mockMatch, overall_score: 52 }
    render(<MatchingCard match={match} />)
    const scoreEl = screen.getByText("52")
    expect(scoreEl.className).toContain("bg-red")
  })

  it("主要スキルを表示する", () => {
    render(<MatchingCard match={mockMatch} />)
    expect(screen.getByText(/React/)).toBeDefined()
    expect(screen.getByText(/TypeScript/)).toBeDefined()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm run test src/components/matching/matching-card.test.tsx`
Expected: FAIL — モジュールが存在しない

- [ ] **Step 3: コンポーネントを実装**

`src/components/matching/matching-card.tsx`:

```tsx
"use client"

import Link from "next/link"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Engineer, Skill } from "@/types"

interface MatchingCardProps {
  match: {
    id: string
    overall_score: number
    skill_score: number
    experience_score: number
    industry_score: number
    condition_score: number
    soft_skill_score: number
    ai_reasoning: string
    engineer: Pick<Engineer, "id" | "name" | "skills" | "experience_years">
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return "bg-green-500 text-white"
  if (score >= 60) return "bg-yellow-500 text-black"
  return "bg-red-500 text-white"
}

function formatTopSkills(skills: Skill[]): string {
  return skills
    .slice(0, 3)
    .map((s) => s.name)
    .join(" / ")
}

export function MatchingCard({ match }: MatchingCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { engineer } = match

  return (
    <Card>
      <CardContent className="p-4">
        {/* ヘッダー: 名前 + スコア */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/engineers/${engineer.id}`}
              className="text-lg font-semibold hover:underline"
            >
              {engineer.name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {formatTopSkills(engineer.skills)} — {engineer.experience_years}年
            </p>
          </div>
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold",
              scoreColor(match.overall_score),
            )}
          >
            {match.overall_score}
          </div>
        </div>

        {/* ��目別スコア */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary">技術 {match.skill_score}</Badge>
          <Badge variant="secondary">経験 {match.experience_score}</Badge>
          <Badge variant="secondary">業界 {match.industry_score}</Badge>
          <Badge variant="secondary">条件 {match.condition_score}</Badge>
          <Badge variant="secondary">ソフト {match.soft_skill_score}</Badge>
        </div>

        {/* AI 評価理由 */}
        <div className="mt-3 border-t pt-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {expanded ? "▼" : "▶"} AI評価
          </button>
          {expanded && (
            <p className="mt-2 text-sm text-muted-foreground">{match.ai_reasoning}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm run test src/components/matching/matching-card.test.tsx`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/components/matching/matching-card.tsx src/components/matching/matching-card.test.tsx
git commit -m "feat: マッチング結果カードコンポーネントを追加"
```

---

### Task 6: マッチング実行ボタンコンポーネント

**Files:**
- Create: `src/components/matching/execute-button.tsx`
- Test: `src/components/matching/execute-button.test.tsx`

- [ ] **Step 1: テストを書く**

`src/components/matching/execute-button.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ExecuteMatchingButton } from "./execute-button"

describe("ExecuteMatchingButton", () => {
  it("ボタンが表示される", () => {
    render(<ExecuteMatchingButton projectId="test-id" />)
    expect(screen.getByRole("button", { name: "マッチング実行" })).toBeDefined()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm run test src/components/matching/execute-button.test.tsx`
Expected: FAIL

- [ ] **Step 3: コンポーネントを実装**

`src/components/matching/execute-button.tsx`:

```tsx
"use client"

import { Loader2, Zap } from "lucide-react"
import { useActionState } from "react"
import { executeMatching } from "@/actions/matching"
import { Button } from "@/components/ui/button"

interface ExecuteMatchingButtonProps {
  projectId: string
  variant?: "default" | "outline"
  size?: "default" | "sm"
}

export function ExecuteMatchingButton({
  projectId,
  variant = "default",
  size = "default",
}: ExecuteMatchingButtonProps) {
  const [state, action, isPending] = useActionState(
    () => executeMatching(projectId),
    null,
  )

  return (
    <form action={action}>
      <Button type="submit" variant={variant} size={size} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            マッチング実行中...
          </>
        ) : (
          <>
            <Zap className="mr-2 h-4 w-4" />
            マッチング実行
          </>
        )}
      </Button>
      {state?.error && <p className="mt-2 text-sm text-destructive">{state.error}</p>}
    </form>
  )
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm run test src/components/matching/execute-button.test.tsx`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/components/matching/execute-button.tsx src/components/matching/execute-button.test.tsx
git commit -m "feat: マッチング実行ボタンコンポーネントを追加"
```

---

### Task 7: マッチング案件選択画面

**Files:**
- Create: `src/app/(dashboard)/matching/page.tsx`

- [ ] **Step 1: ページを実装**

`src/app/(dashboard)/matching/page.tsx`:

```tsx
import { Zap } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExecuteMatchingButton } from "@/components/matching/execute-button"
import { createClient } from "@/lib/supabase/server"

export default async function MatchingPage() {
  const supabase = await createClient()

  // open ステータスの案件を取得
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })

  // マッチング済み案件の結果件数を取得
  const projectIds = (projects ?? []).map((p) => p.id)
  let matchCounts: Record<string, number> = {}

  if (projectIds.length > 0) {
    const { data: counts } = await supabase
      .from("matches")
      .select("project_id")
      .in("project_id", projectIds)

    if (counts) {
      matchCounts = counts.reduce(
        (acc, row) => {
          acc[row.project_id] = (acc[row.project_id] ?? 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">マッチング</h1>
      </div>

      {(!projects || projects.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>募集中の案件がありません</p>
          <Link href="/projects/new" className="mt-2 text-primary underline">
            案件を登録する
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(projects ?? []).map((project) => {
          const count = matchCounts[project.id] ?? 0

          return (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle className="text-lg">{project.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{project.client_name}</p>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex flex-wrap gap-1">
                  {project.required_skills.slice(0, 3).map((skill: { name: string }) => (
                    <Badge key={skill.name} variant="secondary">
                      {skill.name}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <ExecuteMatchingButton projectId={project.id} size="sm" />
                  {count > 0 && (
                    <Link
                      href={`/matching/${project.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      結果を見る（{count}件）
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 開発サーバーで画面が表示されることを確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add src/app/\(dashboard\)/matching/page.tsx
git commit -m "feat: マッチング案件選択画面を追加"
```

---

### Task 8: マッチング��果画面

**Files:**
- Create: `src/app/(dashboard)/matching/[projectId]/page.tsx`

- [ ] **Step 1: ページを実装**

`src/app/(dashboard)/matching/[projectId]/page.tsx`:

```tsx
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getMatchResults } from "@/actions/matching"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExecuteMatchingButton } from "@/components/matching/execute-button"
import { MatchingCard } from "@/components/matching/matching-card"
import { createClient } from "@/lib/supabase/server"

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default async function MatchingResultPage({ params }: PageProps) {
  const { projectId } = await params
  const supabase = await createClient()

  // 案件情報を取得
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single()

  if (!project) notFound()

  // マッチング結果を取得
  const { data: matches, error } = await getMatchResults(projectId)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href="/matching" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">マッチング結果</h1>
            <p className="text-sm text-muted-foreground">
              {project.title} — {project.client_name}
            </p>
          </div>
        </div>
        <ExecuteMatchingButton projectId={projectId} variant="outline" />
      </div>

      {/* 案件サマリー */}
      <div className="flex flex-wrap gap-2">
        {project.required_skills.map((skill: { name: string }) => (
          <Badge key={skill.name} variant="secondary">
            {skill.name}
          </Badge>
        ))}
        <Badge variant="outline">{project.experience_years}年以上</Badge>
        {project.industries.map((ind: string) => (
          <Badge key={ind} variant="outline">
            {ind}
          </Badge>
        ))}
      </div>

      {/* エラー表示 */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* 結果なし */}
      {(!matches || matches.length === 0) && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>マッチング結果がありません</p>
          <p className="text-sm">「マッチング実行」ボタンを押して評価を開始してください</p>
        </div>
      )}

      {/* カードリスト */}
      <div className="space-y-4">
        {(matches ?? []).map((match) => (
          <MatchingCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: ビルドが通ることを確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add src/app/\(dashboard\)/matching/\[projectId\]/page.tsx
git commit -m "feat: マッチング結果画面を追加"
```

---

### Task 9: 案件詳細画面にマッチングボタンを追加

**Files:**
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx`

- [ ] **Step 1: 案件詳細ページを修正**

`src/app/(dashboard)/projects/[id]/page.tsx` に以下を追加:

import を追加:
```typescript
import { Zap } from "lucide-react"
import { ExecuteMatchingButton } from "@/components/matching/execute-button"
```

ボタン群（`<div className="flex gap-2">` 内）の先頭に追加:
```tsx
<ExecuteMatchingButton projectId={id} variant="outline" size="sm" />
```

マッチング結果が存在する場合のリンクを追加��`<ProjectDetail project={project} />` の直前に:
```tsx
{/* マッチング結果へのリンク */}
<div className="flex items-center gap-2">
  <Link
    href={`/matching/${id}`}
    className="text-sm text-primary hover:underline"
  >
    マッチング結果を見る
  </Link>
</div>
```

- [ ] **Step 2: ビルドが通ることを確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add src/app/\(dashboard\)/projects/\[id\]/page.tsx
git commit -m "feat: 案件詳細画面にマッチング実行ボタンを追加"
```

---

### Task 10: lint + format + 全テスト実行 + 最終確認

**Files:** なし（検証のみ）

- [ ] **Step 1: Biome で lint + format**

Run: `pnpm run check`
Expected: エラーなし（自動修正があれば適用される）

- [ ] **Step 2: 全テスト実行**

Run: `pnpm run test`
Expected: 全テスト PASS

- [ ] **Step 3: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 4: 修正があればコミット**

```bash
git add -A
git commit -m "chore: lint + format 修正"
```

- [ ] **Step 5: 最終コミットがなければ完了**

全 Task 完了。
