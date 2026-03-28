# Phase 3: 案件管理 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 案件情報の CRUD、ステータス管理、Embedding 生成を構築し、Phase 4 マッチングの基盤を完成させる。

**Architecture:** Phase 2（エンジニア管理）と同じパターン。Server Actions + Supabase + Zod バリデーション。共通スキーマ（skill, availability）をエンジニアと案件で共有。

**Tech Stack:** Next.js 16, Supabase, AI SDK 6 (OpenAI Embedding), Zod, shadcn/ui

---

## ファイル構成

```
src/
├── app/(dashboard)/
│   └── projects/
│       ├── page.tsx                    ← 一覧（Server Component）
│       ├── new/
│       │   └── page.tsx               ← 新規登録
│       ├── [id]/
│       │   ├── page.tsx               ← 詳細
│       │   └── edit/
│       │       └── page.tsx           ← 編集
│       ├── loading.tsx                ← スケルトン
│       └── _components/
│           ├── project-table.tsx       ← 一覧テーブル（Client）
│           ├── project-form.tsx        ← 登録・編集フォーム（Client）
│           ├── project-detail.tsx      ← 詳細表示（Client）
│           └── project-search-filter.tsx ← 検索・フィルタ（Client）
├── actions/
│   └── projects.ts                    ← Server Actions
└── lib/
    ├── ai/
    │   └── embedding.ts               ← 修正: buildProjectEmbeddingText 追加
    └── validations/
        ├── shared.ts                  ← 新規: 共通スキーマ切り出し
        ├── engineer.ts                ← 修正: shared.ts からインポート
        └── project.ts                ← 新規: 案件用スキーマ
```

---

### Task 1: 共通バリデーションスキーマの切り出し

**Files:**
- Create: `src/lib/validations/shared.ts`
- Modify: `src/lib/validations/engineer.ts`
- Create: `src/lib/validations/shared.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/lib/validations/shared.test.ts
import { describe, expect, it } from "vitest"
import { availabilitySchema, skillSchema } from "./shared"

describe("skillSchema", () => {
  it("有効なスキルを通す", () => {
    const result = skillSchema.safeParse({ name: "TypeScript", level: "advanced", years: 5 })
    expect(result.success).toBe(true)
  })

  it("空のスキル名を拒否する", () => {
    const result = skillSchema.safeParse({ name: "", level: "beginner", years: 0 })
    expect(result.success).toBe(false)
  })

  it("不正なレベルを拒否する", () => {
    const result = skillSchema.safeParse({ name: "JS", level: "master", years: 1 })
    expect(result.success).toBe(false)
  })
})

describe("availabilitySchema", () => {
  it("全フィールド null/false のデフォルトを通す", () => {
    const result = availabilitySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.remote).toBe(false)
      expect(result.data.rate_min).toBeNull()
    }
  })

  it("有効な稼働条件を通す", () => {
    const result = availabilitySchema.safeParse({
      rate_min: 500000,
      rate_max: 800000,
      start_date: "2026-04-01",
      remote: true,
      location: "東京",
    })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm run test src/lib/validations/shared.test.ts`
Expected: FAIL（モジュールが存在しない）

- [ ] **Step 3: shared.ts を作成**

```typescript
// src/lib/validations/shared.ts
import { z } from "zod/v4"

export const skillSchema = z.object({
  name: z.string().min(1),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  years: z.number().min(0),
})

export const availabilitySchema = z.object({
  rate_min: z.number().nullable().default(null),
  rate_max: z.number().nullable().default(null),
  start_date: z.string().nullable().default(null),
  remote: z.boolean().default(false),
  location: z.string().nullable().default(null),
})

export const AVAILABILITY_DEFAULTS = {
  rate_min: null,
  rate_max: null,
  start_date: null,
  remote: false,
  location: null,
} as const
```

- [ ] **Step 4: engineer.ts を shared.ts からインポートに変更**

```typescript
// src/lib/validations/engineer.ts
import { z } from "zod/v4"
import { availabilitySchema, AVAILABILITY_DEFAULTS, skillSchema } from "./shared"

const softSkillSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().default(null),
})

export const engineerFormSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email().nullable().optional().default(null),
  skills: z.array(skillSchema).default([]),
  experience_years: z.number().min(0).default(0),
  industries: z.array(z.string()).default([]),
  availability: availabilitySchema.default(AVAILABILITY_DEFAULTS),
  soft_skills: z.array(softSkillSchema).default([]),
})

export const engineerParseSchema = z.object({
  name: z.string(),
  email: z.string().nullable(),
  skills: z.array(skillSchema),
  experience_years: z.number(),
  industries: z.array(z.string()),
  availability: availabilitySchema,
  soft_skills: z.array(softSkillSchema),
})

export type EngineerFormData = z.infer<typeof engineerFormSchema>
export type EngineerParseData = z.infer<typeof engineerParseSchema>
```

- [ ] **Step 5: 全テストが通ることを確認**

Run: `pnpm run test`
Expected: 全テスト PASS（既存 + 新規 shared テスト）

- [ ] **Step 6: コミット**

```bash
git add src/lib/validations/
git commit -m "refactor: skill/availability スキーマを shared.ts に切り出し"
```

---

### Task 2: 案件用バリデーションスキーマ（TDD）

**Files:**
- Create: `src/lib/validations/project.ts`
- Create: `src/lib/validations/project.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/lib/validations/project.test.ts
import { describe, expect, it } from "vitest"
import { projectFormSchema } from "./project"

describe("projectFormSchema", () => {
  it("有効なデータを通す", () => {
    const data = {
      title: "React フロントエンド開発",
      client_name: "株式会社テスト",
      required_skills: [{ name: "React", level: "advanced", years: 3 }],
      experience_years: 5,
      industries: ["EC"],
      conditions: {
        rate_min: 600000,
        rate_max: 900000,
        start_date: "2026-05-01",
        remote: true,
        location: null,
      },
      description: "ECサイトのフロントエンド開発",
      status: "open",
    }
    const result = projectFormSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it("タイトルが空の場合エラー", () => {
    const data = { title: "", client_name: "テスト", experience_years: 0 }
    const result = projectFormSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it("クライアント名が空の場合エラー", () => {
    const data = { title: "テスト案件", client_name: "", experience_years: 0 }
    const result = projectFormSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it("ステータスが不正な場合エラー", () => {
    const data = {
      title: "テスト",
      client_name: "テスト社",
      experience_years: 0,
      status: "pending",
    }
    const result = projectFormSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it("デフォルト値が適用される", () => {
    const data = {
      title: "テスト案件",
      client_name: "テスト社",
    }
    const result = projectFormSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe("open")
      expect(result.data.required_skills).toEqual([])
      expect(result.data.experience_years).toBe(0)
    }
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm run test src/lib/validations/project.test.ts`
Expected: FAIL

- [ ] **Step 3: スキーマを実装**

```typescript
// src/lib/validations/project.ts
import { z } from "zod/v4"
import { availabilitySchema, AVAILABILITY_DEFAULTS, skillSchema } from "./shared"

export const projectFormSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  client_name: z.string().min(1, "クライアント名は必須です"),
  required_skills: z.array(skillSchema).default([]),
  experience_years: z.number().min(0).default(0),
  industries: z.array(z.string()).default([]),
  conditions: availabilitySchema.default(AVAILABILITY_DEFAULTS),
  description: z.string().default(""),
  status: z.enum(["open", "closed"]).default("open"),
})

export type ProjectFormData = z.infer<typeof projectFormSchema>
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm run test src/lib/validations/project.test.ts`
Expected: PASS（5件）

- [ ] **Step 5: コミット**

```bash
git add src/lib/validations/project.ts src/lib/validations/project.test.ts
git commit -m "feat: 案件用 Zod バリデーションスキーマを追加"
```

---

### Task 3: Embedding テキスト生成の拡張（Project 対応）

**Files:**
- Modify: `src/lib/ai/embedding.ts`
- Modify: `src/lib/ai/embedding.test.ts`

- [ ] **Step 1: テストを追加**

既存の `embedding.test.ts` に以下を追加:

```typescript
// src/lib/ai/embedding.test.ts に追加
import { buildEmbeddingText, buildProjectEmbeddingText } from "./embedding"

// ... 既存テストはそのまま ...

describe("buildProjectEmbeddingText", () => {
  it("案件情報からEmbedding用テキストを生成する", () => {
    const project = {
      title: "React フロントエンド開発",
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
      description: "ECサイトのフロントエンド刷新プロジェクト",
    }
    const text = buildProjectEmbeddingText(project)
    expect(text).toContain("React フロントエンド開発")
    expect(text).toContain("株式会社テスト")
    expect(text).toContain("React")
    expect(text).toContain("TypeScript")
    expect(text).toContain("EC")
    expect(text).toContain("リモート可")
    expect(text).toContain("ECサイト")
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm run test src/lib/ai/embedding.test.ts`
Expected: FAIL（buildProjectEmbeddingText が存在しない）

- [ ] **Step 3: 実装を追加**

`src/lib/ai/embedding.ts` に以下を追加:

```typescript
// 既存の import に追加
import type { ProjectFormData } from "@/lib/validations/project"

// 既存コードの後に追加

type ProjectEmbeddingInput = Pick<
  ProjectFormData,
  "title" | "client_name" | "required_skills" | "experience_years" | "industries" | "conditions" | "description"
>

export function buildProjectEmbeddingText(project: ProjectEmbeddingInput): string {
  const parts: string[] = []

  parts.push(`案件: ${project.title}`)
  parts.push(`クライアント: ${project.client_name}`)
  parts.push(`必要経験年数: ${project.experience_years}年`)

  if (project.required_skills.length > 0) {
    const skillTexts = project.required_skills.map(
      (s) => `${s.name}(${s.level}, ${s.years}年)`,
    )
    parts.push(`要求スキル: ${skillTexts.join(", ")}`)
  }

  if (project.industries.length > 0) {
    parts.push(`業界: ${project.industries.join(", ")}`)
  }

  if (project.conditions) {
    const cond = project.conditions
    const conditions: string[] = []
    if (cond.rate_min || cond.rate_max) {
      conditions.push(`単価: ${cond.rate_min ?? "?"}〜${cond.rate_max ?? "?"}`)
    }
    if (cond.remote) conditions.push("リモート可")
    if (cond.location) conditions.push(`勤務地: ${cond.location}`)
    if (cond.start_date) conditions.push(`稼働開始: ${cond.start_date}`)
    if (conditions.length > 0) {
      parts.push(`条件: ${conditions.join(", ")}`)
    }
  }

  if (project.description) {
    parts.push(`説明: ${project.description}`)
  }

  return parts.join("\n")
}

export async function generateProjectEmbedding(
  project: ProjectEmbeddingInput,
): Promise<number[]> {
  const text = buildProjectEmbeddingText(project)
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  })
  return embedding
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm run test src/lib/ai/embedding.test.ts`
Expected: PASS（既存 + 新規）

- [ ] **Step 5: コミット**

```bash
git add src/lib/ai/embedding.ts src/lib/ai/embedding.test.ts
git commit -m "feat: Project 用 Embedding テキスト生成を追加"
```

---

### Task 4: Server Actions（案件 CRUD）

**Files:**
- Create: `src/actions/projects.ts`

- [ ] **Step 1: Server Actions を実装**

```typescript
// src/actions/projects.ts
"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { generateProjectEmbedding } from "@/lib/ai/embedding"
import { createClient } from "@/lib/supabase/server"
import { projectFormSchema } from "@/lib/validations/project"

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single()
  if (!profile) return { error: "ユーザープロフィールが見つかりません" }

  const raw = JSON.parse(formData.get("data") as string)
  const parsed = projectFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: "入力内容に不備があります" }
  }

  const projectData = parsed.data

  let embedding: number[] | null = null
  try {
    embedding = await generateProjectEmbedding(projectData)
  } catch {
    // Embedding 生成失敗 — 後でリトライ可能
  }

  const { error } = await supabase.from("projects").insert({
    org_id: profile.org_id,
    title: projectData.title,
    client_name: projectData.client_name,
    required_skills: projectData.required_skills,
    experience_years: projectData.experience_years,
    industries: projectData.industries,
    conditions: projectData.conditions,
    description: projectData.description,
    status: projectData.status,
    embedding,
  })

  if (error) return { error: error.message }

  revalidatePath("/projects")
  redirect("/projects")
}

export async function updateProject(id: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const raw = JSON.parse(formData.get("data") as string)
  const parsed = projectFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: "入力内容に不備があります" }
  }

  const projectData = parsed.data

  let embedding: number[] | null = null
  try {
    embedding = await generateProjectEmbedding(projectData)
  } catch {
    // Embedding 生成失敗
  }

  const { error } = await supabase
    .from("projects")
    .update({
      title: projectData.title,
      client_name: projectData.client_name,
      required_skills: projectData.required_skills,
      experience_years: projectData.experience_years,
      industries: projectData.industries,
      conditions: projectData.conditions,
      description: projectData.description,
      status: projectData.status,
      embedding,
    })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/projects")
  revalidatePath(`/projects/${id}`)
  redirect(`/projects/${id}`)
}

export async function deleteProject(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { error } = await supabase.from("projects").delete().eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/projects")
  redirect("/projects")
}

export async function toggleProjectStatus(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { data: project } = await supabase
    .from("projects")
    .select("status")
    .eq("id", id)
    .single()

  if (!project) return { error: "案件が見つかりません" }

  const newStatus = project.status === "open" ? "closed" : "open"

  const { error } = await supabase
    .from("projects")
    .update({ status: newStatus })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/projects")
  revalidatePath(`/projects/${id}`)
}
```

- [ ] **Step 2: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add src/actions/projects.ts
git commit -m "feat: 案件 CRUD + ステータス切替 Server Actions を追加"
```

---

### Task 5: 案件一覧画面

**Files:**
- Create: `src/app/(dashboard)/projects/page.tsx`
- Create: `src/app/(dashboard)/projects/_components/project-table.tsx`
- Create: `src/app/(dashboard)/projects/_components/project-search-filter.tsx`
- Create: `src/app/(dashboard)/projects/loading.tsx`

- [ ] **Step 1: 検索・フィルタコンポーネントを作成**

```tsx
// src/app/(dashboard)/projects/_components/project-search-filter.tsx
"use client"

import { Search, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ProjectSearchFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")
  const [status, setStatus] = useState(searchParams.get("status") ?? "all")

  function handleSearch() {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (status && status !== "all") params.set("status", status)
    router.push(`/projects?${params.toString()}`)
  }

  function handleClear() {
    setQuery("")
    setStatus("all")
    router.push("/projects")
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative max-w-md flex-1">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="タイトル・クライアント名で検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="pl-9"
        />
      </div>
      <Select value={status} onValueChange={(v) => v && setStatus(v)}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="ステータス" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="open">募集中</SelectItem>
          <SelectItem value="closed">終了</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={handleSearch} size="sm" aria-label="検索を実行">
        検索
      </Button>
      {(query || status !== "all") && (
        <Button onClick={handleClear} variant="ghost" size="sm" aria-label="検索条件をクリア">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: テーブルコンポーネントを作成**

```tsx
// src/app/(dashboard)/projects/_components/project-table.tsx
"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Project } from "@/types"

interface ProjectTableProps {
  projects: Project[]
}

export function ProjectTable({ projects }: ProjectTableProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>案件が登録されていません</p>
        <Link href="/projects/new" className="mt-2 text-primary underline">
          案件を登録する
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>タイトル</TableHead>
            <TableHead>クライアント</TableHead>
            <TableHead>要求スキル</TableHead>
            <TableHead>経験年数</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>登録日</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id} className="hover:bg-muted/50">
              <TableCell>
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {project.title}
                </Link>
              </TableCell>
              <TableCell>{project.client_name}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {project.required_skills.slice(0, 3).map((skill) => (
                    <Badge key={skill.name} variant="secondary">
                      {skill.name}
                    </Badge>
                  ))}
                  {project.required_skills.length > 3 && (
                    <Badge variant="outline">+{project.required_skills.length - 3}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{project.experience_years}年</TableCell>
              <TableCell>
                <Badge variant={project.status === "open" ? "default" : "outline"}>
                  {project.status === "open" ? "募集中" : "終了"}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(project.created_at).toLocaleDateString("ja-JP")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 3: ローディング状態を作成**

```tsx
// src/app/(dashboard)/projects/loading.tsx
export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-10 w-full max-w-md animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-10 flex-1 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 一覧ページを作成**

```tsx
// src/app/(dashboard)/projects/page.tsx
import { Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { ProjectSearchFilter } from "./_components/project-search-filter"
import { ProjectTable } from "./_components/project-table"

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase.from("projects").select("*").order("created_at", { ascending: false })

  if (params.q) {
    query = query.or(`title.ilike.%${params.q}%,client_name.ilike.%${params.q}%`)
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status)
  }

  const { data: projects } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">案件</h1>
        <Button render={<Link href="/projects/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          案件登録
        </Button>
      </div>
      <ProjectSearchFilter />
      <ProjectTable projects={projects ?? []} />
    </div>
  )
}
```

- [ ] **Step 5: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功（`/projects` ルート表示）

- [ ] **Step 6: コミット**

```bash
git add src/app/\(dashboard\)/projects/
git commit -m "feat: 案件一覧画面（検索・ステータスフィルタ・テーブル）を追加"
```

---

### Task 6: 案件登録フォーム + 新規登録ページ

**Files:**
- Create: `src/app/(dashboard)/projects/_components/project-form.tsx`
- Create: `src/app/(dashboard)/projects/new/page.tsx`

- [ ] **Step 1: フォームコンポーネントを作成**

エンジニアフォーム（engineer-form.tsx）と同じ構造。主な違い:
- FileUpload なし
- `title`, `client_name` フィールド追加
- `description` テキストエリア追加
- `status` セレクト追加
- `soft_skills`, `email` フィールドなし

```tsx
// src/app/(dashboard)/projects/_components/project-form.tsx
"use client"

import { Loader2, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createProject, updateProject } from "@/actions/projects"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Availability, Project, Skill } from "@/types"

interface ProjectFormProps {
  project?: Project
  mode: "create" | "edit"
}

export function ProjectForm({ project, mode }: ProjectFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const [title, setTitle] = useState(project?.title ?? "")
  const [clientName, setClientName] = useState(project?.client_name ?? "")
  const [skills, setSkills] = useState<Skill[]>(project?.required_skills ?? [])
  const [experienceYears, setExperienceYears] = useState(project?.experience_years ?? 0)
  const [industries, setIndustries] = useState<string[]>(project?.industries ?? [])
  const [conditions, setConditions] = useState<Availability>(
    project?.conditions ?? {
      rate_min: null,
      rate_max: null,
      start_date: null,
      remote: false,
      location: null,
    },
  )
  const [description, setDescription] = useState(project?.description ?? "")
  const [status, setStatus] = useState<"open" | "closed">(
    (project?.status as "open" | "closed") ?? "open",
  )
  const [newIndustry, setNewIndustry] = useState("")

  function addSkill() {
    setSkills([...skills, { name: "", level: "intermediate", years: 0 }])
  }

  function removeSkill(index: number) {
    setSkills(skills.filter((_, i) => i !== index))
  }

  function updateSkill(index: number, field: keyof Skill, value: string | number) {
    const updated = [...skills]
    updated[index] = { ...updated[index], [field]: value }
    setSkills(updated)
  }

  function addIndustry() {
    if (newIndustry && !industries.includes(newIndustry)) {
      setIndustries([...industries, newIndustry])
      setNewIndustry("")
    }
  }

  function removeIndustry(industry: string) {
    setIndustries(industries.filter((i) => i !== industry))
  }

  async function handleSubmit() {
    setPending(true)
    setError(null)

    const formData = new FormData()
    formData.append(
      "data",
      JSON.stringify({
        title,
        client_name: clientName,
        required_skills: skills,
        experience_years: experienceYears,
        industries,
        conditions,
        description,
        status,
      }),
    )

    const result =
      mode === "create"
        ? await createProject(formData)
        : await updateProject(project!.id, formData)

    if (result?.error) {
      setError(result.error)
      setPending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">タイトル *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_name">クライアント名 *</Label>
              <Input
                id="client_name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="experience">必要経験年数</Label>
              <Input
                id="experience"
                type="number"
                min={0}
                value={experienceYears}
                onChange={(e) => setExperienceYears(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">ステータス</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v as "open" | "closed")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">募集中</SelectItem>
                  <SelectItem value="closed">終了</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">案件説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="案件の詳細を記入..."
            />
          </div>
        </CardContent>
      </Card>

      {/* 要求スキル */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>要求スキル</CardTitle>
          <Button variant="outline" size="sm" onClick={addSkill}>
            <Plus className="mr-1 h-4 w-4" />
            追加
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {skills.map((skill, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skills have no unique ID
            <div key={i} className="flex items-center gap-3">
              <Input
                placeholder="スキル名"
                value={skill.name}
                onChange={(e) => updateSkill(i, "name", e.target.value)}
                className="flex-1"
              />
              <Select
                value={skill.level}
                onValueChange={(v) => v && updateSkill(i, "level", v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">初級</SelectItem>
                  <SelectItem value="intermediate">中級</SelectItem>
                  <SelectItem value="advanced">上級</SelectItem>
                  <SelectItem value="expert">エキスパート</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                placeholder="年数"
                value={skill.years}
                onChange={(e) => updateSkill(i, "years", Number(e.target.value))}
                className="w-20"
              />
              <Button variant="ghost" size="icon-xs" onClick={() => removeSkill(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 業界 */}
      <Card>
        <CardHeader>
          <CardTitle>業界</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {industries.map((industry) => (
              <Badge
                key={industry}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeIndustry(industry)}
              >
                {industry} ×
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="業界を追加（例: 金融）"
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIndustry())}
            />
            <Button variant="outline" size="sm" onClick={addIndustry}>
              追加
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 稼働条件 */}
      <Card>
        <CardHeader>
          <CardTitle>稼働条件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>最低単価（円/月）</Label>
              <Input
                type="number"
                value={conditions.rate_min ?? ""}
                onChange={(e) =>
                  setConditions({
                    ...conditions,
                    rate_min: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>最高単価（円/月）</Label>
              <Input
                type="number"
                value={conditions.rate_max ?? ""}
                onChange={(e) =>
                  setConditions({
                    ...conditions,
                    rate_max: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>稼働開始日</Label>
              <Input
                type="date"
                value={conditions.start_date ?? ""}
                onChange={(e) =>
                  setConditions({
                    ...conditions,
                    start_date: e.target.value || null,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>勤務地</Label>
              <Input
                value={conditions.location ?? ""}
                onChange={(e) =>
                  setConditions({
                    ...conditions,
                    location: e.target.value || null,
                  })
                }
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={conditions.remote}
              onChange={(e) => setConditions({ ...conditions, remote: e.target.checked })}
              className="cursor-pointer rounded"
            />
            リモートワーク可
          </label>
        </CardContent>
      </Card>

      {/* エラー + 送信 */}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "登録" : "更新"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 新規登録ページを作成**

```tsx
// src/app/(dashboard)/projects/new/page.tsx
import { ProjectForm } from "../_components/project-form"

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">案件登録</h1>
      <ProjectForm mode="create" />
    </div>
  )
}
```

- [ ] **Step 3: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 4: コミット**

```bash
git add src/app/\(dashboard\)/projects/
git commit -m "feat: 案件登録フォーム + 新規登録ページを追加"
```

---

### Task 7: 案件詳細画面 + ステータス切替

**Files:**
- Create: `src/app/(dashboard)/projects/_components/project-detail.tsx`
- Create: `src/app/(dashboard)/projects/[id]/page.tsx`

- [ ] **Step 1: 詳細表示コンポーネントを作成**

```tsx
// src/app/(dashboard)/projects/_components/project-detail.tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Project } from "@/types"

interface ProjectDetailProps {
  project: Project
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
  expert: "エキスパート",
}

export function ProjectDetail({ project }: ProjectDetailProps) {
  return (
    <div className="space-y-4">
      {/* 要求スキル */}
      <Card>
        <CardHeader>
          <CardTitle>要求スキル</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {project.required_skills.map((skill) => (
              <Badge key={skill.name} variant="secondary">
                {skill.name}（{LEVEL_LABELS[skill.level]}・{skill.years}年）
              </Badge>
            ))}
            {project.required_skills.length === 0 && (
              <p className="text-sm text-muted-foreground">未登録</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">クライアント</dt>
              <dd className="font-medium">{project.client_name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">必要経験年数</dt>
              <dd className="font-medium">{project.experience_years}年</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">業界</dt>
              <dd className="font-medium">{project.industries.join(", ") || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">リモート</dt>
              <dd className="font-medium">
                {project.conditions?.remote ? "可" : "不可"}
              </dd>
            </div>
            {(project.conditions?.rate_min || project.conditions?.rate_max) && (
              <div>
                <dt className="text-muted-foreground">単価</dt>
                <dd className="font-medium">
                  {project.conditions.rate_min?.toLocaleString()}〜
                  {project.conditions.rate_max?.toLocaleString()}円
                </dd>
              </div>
            )}
            {project.conditions?.location && (
              <div>
                <dt className="text-muted-foreground">勤務地</dt>
                <dd className="font-medium">{project.conditions.location}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* 案件説明 */}
      {project.description && (
        <Card>
          <CardHeader>
            <CardTitle>案件説明</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{project.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 詳細ページを作成**

```tsx
// src/app/(dashboard)/projects/[id]/page.tsx
import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { deleteProject, toggleProjectStatus } from "@/actions/projects"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { ProjectDetail } from "../_components/project-detail"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single()

  if (!project) notFound()

  async function handleDelete() {
    "use server"
    await deleteProject(id)
  }

  async function handleToggleStatus() {
    "use server"
    await toggleProjectStatus(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href="/projects" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <Badge variant={project.status === "open" ? "default" : "outline"}>
            {project.status === "open" ? "募集中" : "終了"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <form action={handleToggleStatus}>
            <Button variant="outline" type="submit">
              {project.status === "open" ? "終了にする" : "募集中にする"}
            </Button>
          </form>
          <Button variant="outline" render={<Link href={`/projects/${id}/edit`} />}>
            <Pencil className="mr-2 h-4 w-4" />
            編集
          </Button>
          <form action={handleDelete}>
            <Button variant="destructive" type="submit">
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </Button>
          </form>
        </div>
      </div>

      <ProjectDetail project={project} />
    </div>
  )
}
```

- [ ] **Step 3: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 4: コミット**

```bash
git add src/app/\(dashboard\)/projects/
git commit -m "feat: 案件詳細画面（ステータス切替 + 要求スキル表示）を追加"
```

---

### Task 8: 案件編集ページ + 最終検証

**Files:**
- Create: `src/app/(dashboard)/projects/[id]/edit/page.tsx`

- [ ] **Step 1: 編集ページを作成**

```tsx
// src/app/(dashboard)/projects/[id]/edit/page.tsx
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProjectForm } from "../../_components/project-form"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProjectPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single()

  if (!project) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{project.title} を編集</h1>
      <ProjectForm project={project} mode="edit" />
    </div>
  )
}
```

- [ ] **Step 2: Biome check**

Run: `pnpm run check`
Expected: エラーなし

- [ ] **Step 3: 全テスト実行**

Run: `pnpm run test`
Expected: 全テスト PASS

- [ ] **Step 4: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功、以下のルートが表示される:
- `/projects`
- `/projects/new`
- `/projects/[id]`
- `/projects/[id]/edit`

- [ ] **Step 5: コミット + プッシュ**

```bash
git add src/app/\(dashboard\)/projects/\[id\]/edit/
git commit -m "feat: 案件編集ページを追加"
git push
```

---

## 完了基準

- [ ] 共通スキーマ（skill, availability）がエンジニアと案件で共有されている
- [ ] 案件一覧画面が表示される（検索・ステータスフィルタ）
- [ ] フォーム入力で案件を登録できる
- [ ] 案件詳細画面で要求スキル・条件が表示される
- [ ] ステータスを open ↔ closed でワンクリック切替できる
- [ ] 案件の編集・削除ができる
- [ ] Embedding が生成され pgvector に保存される
- [ ] `pnpm run build` が通る
- [ ] `pnpm run test` が通る
- [ ] `pnpm run check` が通る
