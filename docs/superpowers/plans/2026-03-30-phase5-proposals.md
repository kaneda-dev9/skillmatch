# Phase 5: 提案書生成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** マッチング結果からエンジニアの提案書を Claude でストリーミング生成し、編集・PDF ダウンロード・コピーが可能な2カラムUIを構築する

**Architecture:** Route Handler で `streamText` によるストリーミング生成。クライアントは `useCompletion` フックで受信し、react-markdown でリアルタイムプレビュー。生成後は Markdown エディタで編集し、Server Action で保存。PDF は html2pdf.js でクライアントサイド生成。

**Tech Stack:** Next.js 16 (App Router), Vercel AI SDK 6 (streamText, useCompletion), Claude claude-sonnet-4-6, react-markdown, html2pdf.js, shadcn/ui, Vitest

---

## ファイル構成

```
新規作成:
  src/lib/ai/proposal.ts                              — プロンプト生成 + 型定義
  src/lib/ai/proposal.test.ts                          — プロンプト生成テスト
  src/app/api/proposals/generate/route.ts              — ストリーミング Route Handler
  src/actions/proposals.ts                             — Server Actions（CRUD）
  src/actions/proposals.test.ts                        — Server Actions テスト
  src/components/proposals/proposal-editor.tsx          — 2カラムエディタ（プレビュー + 編集）
  src/components/proposals/proposal-editor.test.tsx     — エディタテスト
  src/components/proposals/pdf-download-button.tsx      — PDF ダウンロードボタン
  src/app/(dashboard)/proposals/new/page.tsx           — 生成画面
  src/app/(dashboard)/proposals/[id]/page.tsx          — 詳細画面
  src/app/(dashboard)/proposals/page.tsx               — 一覧画面

修正:
  src/components/matching/matching-card.tsx             — 提案書ボタン追加
```

---

### Task 1: パッケージ追加

**Files:** なし（依存関係のみ）

- [ ] **Step 1: react-markdown と html2pdf.js をインストール**

```bash
pnpm add react-markdown html2pdf.js
```

- [ ] **Step 2: コミット**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: react-markdown と html2pdf.js を追加"
```

---

### Task 2: 提案書生成プロンプト

**Files:**
- Create: `src/lib/ai/proposal.ts`
- Test: `src/lib/ai/proposal.test.ts`

- [ ] **Step 1: テストを書く**

`src/lib/ai/proposal.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { buildProposalPrompt } from "./proposal"

describe("buildProposalPrompt", () => {
  const project = {
    title: "ECサイトリニューアル",
    client_name: "株式会社ファッションモール",
    required_skills: [
      { name: "React", level: "advanced" as const, years: 3 },
      { name: "TypeScript", level: "intermediate" as const, years: 2 },
    ],
    experience_years: 5,
    industries: ["EC", "小売"],
    conditions: {
      rate_min: 600000,
      rate_max: 900000,
      start_date: null,
      remote: true,
      location: null,
    },
    description: "ECサイトのフロントエンド刷新プロジェクト",
  }

  const engineer = {
    name: "田中太郎",
    skills: [
      { name: "React", level: "expert" as const, years: 8 },
      { name: "TypeScript", level: "advanced" as const, years: 6 },
    ],
    experience_years: 10,
    industries: ["EC", "金融"],
    availability: {
      rate_min: 600000,
      rate_max: 900000,
      start_date: null,
      remote: true,
      location: "東京",
    },
    soft_skills: [
      { name: "リーダーシップ", description: "5名チームのリーダー経験" },
    ],
  }

  const match = {
    overall_score: 92,
    skill_score: 95,
    experience_score: 98,
    industry_score: 90,
    condition_score: 85,
    soft_skill_score: 88,
    ai_reasoning: "React/TypeScriptの実務経験が豊富で即戦力として期待できる。",
  }

  it("案件情報がプロンプトに含まれる", () => {
    const prompt = buildProposalPrompt(project, engineer, match)
    expect(prompt).toContain("ECサイトリニューアル")
    expect(prompt).toContain("株式会社ファッションモール")
  })

  it("エンジニア情報がプロンプトに含まれる", () => {
    const prompt = buildProposalPrompt(project, engineer, match)
    expect(prompt).toContain("田中太郎")
    expect(prompt).toContain("React")
    expect(prompt).toContain("リーダーシップ")
  })

  it("マッチングスコアがプロンプトに含まれる", () => {
    const prompt = buildProposalPrompt(project, engineer, match)
    expect(prompt).toContain("92")
    expect(prompt).toContain("95")
  })

  it("定型フォーマットの指示が含まれる", () => {
    const prompt = buildProposalPrompt(project, engineer, match)
    expect(prompt).toContain("候補者概要")
    expect(prompt).toContain("スキルマッチ度")
    expect(prompt).toContain("推薦理由")
    expect(prompt).toContain("稼働条件")
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm run test src/lib/ai/proposal.test.ts`
Expected: FAIL — `buildProposalPrompt` が未定義

- [ ] **Step 3: 実装**

`src/lib/ai/proposal.ts`:

```typescript
import type { Availability, Skill, SoftSkill } from "@/types"

interface ProjectForProposal {
  title: string
  client_name: string
  required_skills: Skill[]
  experience_years: number
  industries: string[]
  conditions: Availability
  description: string
}

interface EngineerForProposal {
  name: string
  skills: Skill[]
  experience_years: number
  industries: string[]
  availability: Availability
  soft_skills: SoftSkill[]
}

interface MatchForProposal {
  overall_score: number
  skill_score: number
  experience_score: number
  industry_score: number
  condition_score: number
  soft_skill_score: number
  ai_reasoning: string
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

export function buildProposalPrompt(
  project: ProjectForProposal,
  engineer: EngineerForProposal,
  match: MatchForProposal,
): string {
  return `あなたはSES営業の提案書作成の専門家です。以下の案件・エンジニア・マッチング評価の情報をもとに、クライアント企業への提案書を作成してください。

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
- ソフトスキル: ${engineer.soft_skills.map((s) => `${s.name}${s.description ? `（${s.description}）` : ""}`).join(", ") || "なし"}

## マッチング評価
- 総合スコア: ${match.overall_score}/100
- 技術スキル: ${match.skill_score} | 経験年数: ${match.experience_score} | 業界: ${match.industry_score} | 条件: ${match.condition_score} | ソフトスキル: ${match.soft_skill_score}
- AI評価: ${match.ai_reasoning}

## 出力フォーマット（必ずこの構成で作成）

以下のMarkdown形式で提案書を作成してください:

# 候補者ご提案書

## 候補者概要
氏名、経験年数、主要スキルの要約を2〜3文で。

## スキルマッチ度
総合スコアと項目別スコアを表形式で示し、各項目の簡潔な説明を付けてください。

## 推薦理由
案件要件とエンジニアのスキル・経験の具体的な合致点を述べ、なぜこの候補者が最適かを3〜5段落で説明してください。具体的な技術名や経験を挙げて根拠を示してください。

## 稼働条件
単価、稼働開始日、リモート可否、勤務地を記載し、案件条件との適合状況を述べてください。`
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm run test src/lib/ai/proposal.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/ai/proposal.ts src/lib/ai/proposal.test.ts
git commit -m "feat: 提案書生成プロンプトを追加"
```

---

### Task 3: ストリーミング Route Handler

**Files:**
- Create: `src/app/api/proposals/generate/route.ts`

- [ ] **Step 1: Route Handler を実装**

`src/app/api/proposals/generate/route.ts`:

```typescript
import { streamText } from "ai"
import { buildProposalPrompt } from "@/lib/ai/proposal"
import { llm } from "@/lib/ai/provider"
import { createClient } from "@/lib/supabase/server"
import type { Availability, Skill, SoftSkill } from "@/types"

export async function POST(request: Request) {
  const { matchId } = await request.json()

  if (!matchId) {
    return Response.json({ error: "matchId is required" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "認証が必要です" }, { status: 401 })
  }

  // match + engineer + project を取得
  const { data: match } = await supabase
    .from("matches")
    .select("*, engineer:engineers(*), project:projects(*)")
    .eq("id", matchId)
    .single()

  if (!match) {
    return Response.json({ error: "マッチング結果が見つかりません" }, { status: 404 })
  }

  const project = {
    title: match.project.title,
    client_name: match.project.client_name,
    required_skills: match.project.required_skills as Skill[],
    experience_years: match.project.experience_years,
    industries: match.project.industries,
    conditions: match.project.conditions as Availability,
    description: match.project.description,
  }

  const engineer = {
    name: match.engineer.name,
    skills: match.engineer.skills as Skill[],
    experience_years: match.engineer.experience_years,
    industries: match.engineer.industries,
    availability: match.engineer.availability as Availability,
    soft_skills: match.engineer.soft_skills as SoftSkill[],
  }

  const matchData = {
    overall_score: match.overall_score,
    skill_score: match.skill_score,
    experience_score: match.experience_score,
    industry_score: match.industry_score,
    condition_score: match.condition_score,
    soft_skill_score: match.soft_skill_score,
    ai_reasoning: match.ai_reasoning,
  }

  const prompt = buildProposalPrompt(project, engineer, matchData)

  const result = streamText({
    model: llm,
    messages: [{ role: "user", content: prompt }],
  })

  return result.toDataStreamResponse()
}
```

- [ ] **Step 2: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add src/app/api/proposals/generate/route.ts
git commit -m "feat: 提案書ストリーミング生成の Route Handler を追加"
```

---

### Task 4: Server Actions（CRUD）

**Files:**
- Create: `src/actions/proposals.ts`
- Create: `src/actions/proposals.test.ts`

- [ ] **Step 1: テストを書く**

`src/actions/proposals.test.ts`:

```typescript
import { describe, expect, it } from "vitest"

describe("proposal actions", () => {
  it("モジュールがエクスポートされている", async () => {
    const mod = await import("./proposals")
    expect(mod.saveProposal).toBeDefined()
    expect(mod.updateProposal).toBeDefined()
    expect(mod.deleteProposal).toBeDefined()
    expect(typeof mod.saveProposal).toBe("function")
    expect(typeof mod.updateProposal).toBe("function")
    expect(typeof mod.deleteProposal).toBe("function")
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm run test src/actions/proposals.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装**

`src/actions/proposals.ts`:

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function saveProposal(matchId: string, content: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { data: profile } = await supabase.from("users").select("org_id").eq("id", user.id).single()
  if (!profile) return { error: "ユーザープロフィールが見つかりません" }

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      org_id: profile.org_id,
      match_id: matchId,
      content,
      format: "markdown",
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  revalidatePath("/proposals")
  return { id: data.id }
}

export async function updateProposal(id: string, content: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { error } = await supabase
    .from("proposals")
    .update({ content })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/proposals")
  revalidatePath(`/proposals/${id}`)
  return { success: true }
}

export async function deleteProposal(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { error } = await supabase.from("proposals").delete().eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/proposals")
  redirect("/proposals")
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm run test src/actions/proposals.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/actions/proposals.ts src/actions/proposals.test.ts
git commit -m "feat: 提案書 CRUD の Server Actions を追加"
```

---

### Task 5: 2カラムエディタコンポーネント

**Files:**
- Create: `src/components/proposals/proposal-editor.tsx`
- Create: `src/components/proposals/proposal-editor.test.tsx`

- [ ] **Step 1: テストを書く**

`src/components/proposals/proposal-editor.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ProposalEditor } from "./proposal-editor"

describe("ProposalEditor", () => {
  it("プレビューとエディタの2カラムが表示される", () => {
    render(<ProposalEditor content="# テスト" matchId="m1" />)
    expect(screen.getByText("プレビュー")).toBeDefined()
    expect(screen.getByText("エディタ")).toBeDefined()
  })

  it("Markdown コンテンツがプレビューに表示される", () => {
    render(<ProposalEditor content="# テスト見出し" matchId="m1" />)
    expect(screen.getByText("テスト見出し")).toBeDefined()
  })

  it("コピーボタンが表示される", () => {
    render(<ProposalEditor content="test" matchId="m1" />)
    expect(screen.getByRole("button", { name: /コピー/ })).toBeDefined()
  })

  it("保存ボタンが表示される", () => {
    render(<ProposalEditor content="test" matchId="m1" />)
    expect(screen.getByRole("button", { name: /保存/ })).toBeDefined()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm run test src/components/proposals/proposal-editor.test.tsx`
Expected: FAIL

- [ ] **Step 3: 実装**

`src/components/proposals/proposal-editor.tsx`:

```tsx
"use client"

import { Check, Copy, Save } from "lucide-react"
import { useState } from "react"
import Markdown from "react-markdown"
import { saveProposal, updateProposal } from "@/actions/proposals"
import { Button } from "@/components/ui/button"

interface ProposalEditorProps {
  content: string
  matchId: string
  proposalId?: string
  readOnly?: boolean
}

export function ProposalEditor({
  content: initialContent,
  matchId,
  proposalId,
  readOnly = false,
}: ProposalEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)

    const result = proposalId
      ? await updateProposal(proposalId, content)
      : await saveProposal(matchId, content)

    setSaving(false)

    if ("error" in result && result.error) {
      setError(result.error)
      return
    }

    if (!proposalId && "id" in result) {
      window.location.href = `/proposals/${result.id}`
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 左カラム: プレビュー */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">プレビュー</h3>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <Markdown>{content}</Markdown>
        </div>
      </div>

      {/* 右カラム: エディタ */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">エディタ</h3>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={readOnly}
          className="h-96 w-full resize-y rounded-md border bg-background p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

        <div className="mt-3 flex gap-2">
          <Button onClick={handleSave} disabled={saving || readOnly} size="sm">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "保存中..." : proposalId ? "更新" : "保存"}
          </Button>
          <Button onClick={handleCopy} variant="outline" size="sm">
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                コピー済み
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                コピー
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm run test src/components/proposals/proposal-editor.test.tsx`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/components/proposals/proposal-editor.tsx src/components/proposals/proposal-editor.test.tsx
git commit -m "feat: 提案書2カラムエディタコンポーネントを追加"
```

---

### Task 6: PDF ダウンロードボタン

**Files:**
- Create: `src/components/proposals/pdf-download-button.tsx`

- [ ] **Step 1: 実装**

`src/components/proposals/pdf-download-button.tsx`:

```tsx
"use client"

import { Download } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface PdfDownloadButtonProps {
  content: string
  fileName?: string
}

export function PdfDownloadButton({
  content,
  fileName = "proposal",
}: PdfDownloadButtonProps) {
  const [generating, setGenerating] = useState(false)

  async function handleDownload() {
    setGenerating(true)

    try {
      // react-markdown と同じ方法で HTML に変換
      const { default: html2pdf } = await import("html2pdf.js")

      const container = document.createElement("div")
      container.style.padding = "40px"
      container.style.fontFamily = "'Noto Sans JP', sans-serif"
      container.style.fontSize = "14px"
      container.style.lineHeight = "1.8"
      container.style.color = "#1a1a1a"

      // Markdown → HTML 変換（簡易）
      const html = content
        .replace(/^# (.+)$/gm, "<h1 style='font-size:24px;margin-bottom:16px'>$1</h1>")
        .replace(/^## (.+)$/gm, "<h2 style='font-size:18px;margin-top:24px;margin-bottom:12px'>$1</h2>")
        .replace(/^### (.+)$/gm, "<h3 style='font-size:16px;margin-top:16px;margin-bottom:8px'>$1</h3>")
        .replace(/^- (.+)$/gm, "<li style='margin-left:20px'>$1</li>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n\n/g, "<br><br>")
        .replace(/\n/g, "<br>")

      container.innerHTML = html

      await html2pdf()
        .set({
          margin: 10,
          filename: `${fileName}.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(container)
        .save()
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button onClick={handleDownload} variant="outline" size="sm" disabled={generating}>
      <Download className="mr-2 h-4 w-4" />
      {generating ? "生成中..." : "PDF"}
    </Button>
  )
}
```

- [ ] **Step 2: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add src/components/proposals/pdf-download-button.tsx
git commit -m "feat: PDF ダウンロードボタンを追加"
```

---

### Task 7: 提案書生成画面

**Files:**
- Create: `src/app/(dashboard)/proposals/new/page.tsx`

- [ ] **Step 1: 実装**

`src/app/(dashboard)/proposals/new/page.tsx`:

```tsx
"use client"

import { useCompletion } from "@ai-sdk/react"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PdfDownloadButton } from "@/components/proposals/pdf-download-button"
import { ProposalEditor } from "@/components/proposals/proposal-editor"

export default function NewProposalPage() {
  const searchParams = useSearchParams()
  const matchId = searchParams.get("matchId")

  const { completion, isLoading, complete, error } = useCompletion({
    api: "/api/proposals/generate",
  })

  useEffect(() => {
    if (matchId) {
      complete("", { body: { matchId } })
    }
  }, [matchId, complete])

  if (!matchId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>matchId が指定されていません</p>
        <Link href="/matching" className="mt-2 text-primary underline">
          マッチング画面に戻る
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href={`/matching`} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">提案書生成</h1>
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              生成中...
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          提案書の生成に失敗しました。再試行してください。
        </p>
      )}

      {isLoading && completion && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">プレビュー</h3>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <StreamingMarkdown content={completion} />
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">エディタ</h3>
            <textarea
              value={completion}
              disabled
              className="h-96 w-full resize-y rounded-md border bg-muted p-3 font-mono text-sm"
            />
          </div>
        </div>
      )}

      {!isLoading && completion && (
        <>
          <ProposalEditor content={completion} matchId={matchId} />
          <div className="flex justify-end">
            <PdfDownloadButton content={completion} />
          </div>
        </>
      )}
    </div>
  )
}

function StreamingMarkdown({ content }: { content: string }) {
  // dynamic import を避けるために直接使用
  const Markdown = require("react-markdown").default
  return <Markdown>{content}</Markdown>
}
```

注意: ファイル先頭に `import Markdown from "react-markdown"` を追加し、`StreamingMarkdown` コンポーネントは使わず直接 `<Markdown>{completion}</Markdown>` を使うこと。上記コード例の `StreamingMarkdown` は `<Markdown>` に置き換えて実装する。

- [ ] **Step 2: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add "src/app/(dashboard)/proposals/new/page.tsx"
git commit -m "feat: 提案書生成画面を追加"
```

---

### Task 8: 提案書詳細画面

**Files:**
- Create: `src/app/(dashboard)/proposals/[id]/page.tsx`

- [ ] **Step 1: 実装**

`src/app/(dashboard)/proposals/[id]/page.tsx`:

```tsx
import { ArrowLeft, Trash2 } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { deleteProposal } from "@/actions/proposals"
import { PdfDownloadButton } from "@/components/proposals/pdf-download-button"
import { ProposalEditor } from "@/components/proposals/proposal-editor"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProposalDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*, match:matches(*, engineer:engineers(name), project:projects(title, client_name))")
    .eq("id", id)
    .single()

  if (!proposal) notFound()

  const projectTitle = proposal.match?.project?.title ?? "不明"
  const engineerName = proposal.match?.engineer?.name ?? "不明"

  async function handleDelete() {
    "use server"
    await deleteProposal(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href="/proposals" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">提案書</h1>
            <p className="text-sm text-muted-foreground">
              {projectTitle} × {engineerName}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <PdfDownloadButton
            content={proposal.content}
            fileName={`proposal-${engineerName}`}
          />
          <form action={handleDelete}>
            <Button variant="destructive" size="sm" type="submit">
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </Button>
          </form>
        </div>
      </div>

      <ProposalEditor
        content={proposal.content}
        matchId={proposal.match_id}
        proposalId={id}
      />
    </div>
  )
}
```

- [ ] **Step 2: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add "src/app/(dashboard)/proposals/[id]/page.tsx"
git commit -m "feat: 提案書詳細画面を追加"
```

---

### Task 9: 提案書一覧画面

**Files:**
- Create: `src/app/(dashboard)/proposals/page.tsx`

- [ ] **Step 1: 実装**

`src/app/(dashboard)/proposals/page.tsx`:

```tsx
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"

export default async function ProposalsPage() {
  const supabase = await createClient()

  const { data: proposals } = await supabase
    .from("proposals")
    .select("*, match:matches(*, engineer:engineers(name), project:projects(title, client_name))")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">提案書</h1>

      {(!proposals || proposals.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>提案書がありません</p>
          <Link href="/matching" className="mt-2 text-primary underline">
            マッチング画面で提案書を生成する
          </Link>
        </div>
      )}

      {proposals && proposals.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>案件名</TableHead>
                <TableHead>エンジニア</TableHead>
                <TableHead>生成日時</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((proposal) => (
                <TableRow key={proposal.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Link
                      href={`/proposals/${proposal.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {proposal.match?.project?.title ?? "不明"}
                    </Link>
                  </TableCell>
                  <TableCell>{proposal.match?.engineer?.name ?? "不明"}</TableCell>
                  <TableCell>
                    {new Date(proposal.created_at).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add "src/app/(dashboard)/proposals/page.tsx"
git commit -m "feat: 提案書一覧画面を追加"
```

---

### Task 10: マッチングカードに提案書ボタン追加

**Files:**
- Modify: `src/components/matching/matching-card.tsx`

- [ ] **Step 1: マッチングカードに提案書生成ボタンを追加**

`src/components/matching/matching-card.tsx` を修正:

import を追加:
```typescript
import { FileText } from "lucide-react"
```

MatchingCardProps の match に `id` フィールドがすでにあるので、それを使用。

AI評価セクション（`<div className="mt-3 border-t pt-3">` 内）のボタンの横に追加:

```tsx
<div className="mt-3 flex items-center gap-3 border-t pt-3">
  <button
    type="button"
    onClick={() => setExpanded(!expanded)}
    className="text-sm text-muted-foreground hover:text-foreground"
  >
    {expanded ? "▼" : "▶"} AI評価
  </button>
  <Link
    href={`/proposals/new?matchId=${match.id}`}
    className="flex items-center gap-1 text-sm text-primary hover:underline"
  >
    <FileText className="h-3 w-3" />
    提案書を生成
  </Link>
</div>
```

既存の `<div className="mt-3 border-t pt-3">` セクション全体を上記に置き換える。

- [ ] **Step 2: テストが通ることを確認**

Run: `pnpm run test src/components/matching/matching-card.test.tsx`
Expected: PASS

- [ ] **Step 3: コミット**

```bash
git add src/components/matching/matching-card.tsx
git commit -m "feat: マッチングカードに提案書生成ボタンを追加"
```

---

### Task 11: lint + format + 全テスト + ビルド確認

**Files:** なし（検証のみ）

- [ ] **Step 1: Biome で lint + format**

Run: `pnpm run check`
Expected: エラーなし

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

- [ ] **Step 5: 完了**

全 Task 完了。
