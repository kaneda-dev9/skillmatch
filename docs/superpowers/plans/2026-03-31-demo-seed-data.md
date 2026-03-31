# デモデータ投入機能 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ダッシュボードからワンクリックでエンジニア9名＋案件6件のデモデータを投入し、Embedding 付きでマッチングまで即試せる状態にする

**Architecture:** Server Action `seedDemoData()` がデモデータを一括 insert し、Embedding を並列生成。ダッシュボードに Client Component のボタンを配置し、確認ダイアログ経由で実行する。

**Tech Stack:** Next.js Server Actions, Supabase, AI SDK (embed), shadcn/ui (Button, AlertDialog)

---

### Task 1: Server Action `seedDemoData` 作成

**Files:**
- Create: `src/actions/seed.ts`

- [ ] **Step 1: デモデータ定義と Server Action を作成**

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { generateEmbedding, generateProjectEmbedding } from "@/lib/ai/embedding"
import { createClient } from "@/lib/supabase/server"
import type { Availability, Skill, SoftSkill } from "@/types"

interface DemoEngineer {
  name: string
  email: string
  skills: Skill[]
  experience_years: number
  industries: string[]
  availability: Availability
  soft_skills: SoftSkill[]
}

interface DemoProject {
  title: string
  client_name: string
  required_skills: Skill[]
  experience_years: number
  industries: string[]
  conditions: Availability
  description: string
}

const demoEngineers: DemoEngineer[] = [
  {
    name: "田中太郎",
    email: "tanaka@example.com",
    skills: [
      { name: "React", level: "advanced", years: 5 },
      { name: "TypeScript", level: "advanced", years: 5 },
      { name: "Next.js", level: "intermediate", years: 3 },
    ],
    experience_years: 8,
    industries: ["EC", "SaaS"],
    availability: { rate_min: 600000, rate_max: 800000, start_date: "2026-05-01", remote: true, location: "東京" },
    soft_skills: [
      { name: "コミュニケーション", description: "チーム内外との円滑な連携" },
      { name: "問題解決力", description: "技術的課題の迅速な解決" },
    ],
  },
  {
    name: "鈴木花子",
    email: "suzuki@example.com",
    skills: [
      { name: "Python", level: "expert", years: 10 },
      { name: "AWS", level: "advanced", years: 8 },
      { name: "Docker", level: "intermediate", years: 4 },
    ],
    experience_years: 12,
    industries: ["金融", "ヘルスケア"],
    availability: { rate_min: 800000, rate_max: 1000000, start_date: "2026-04-15", remote: true, location: "大阪" },
    soft_skills: [
      { name: "リーダーシップ", description: "チームのリード経験豊富" },
      { name: "メンタリング", description: "若手エンジニアの育成" },
    ],
  },
  {
    name: "佐藤健一",
    email: "sato@example.com",
    skills: [
      { name: "React", level: "intermediate", years: 3 },
      { name: "Node.js", level: "advanced", years: 5 },
      { name: "PostgreSQL", level: "advanced", years: 5 },
    ],
    experience_years: 6,
    industries: ["SaaS", "教育"],
    availability: { rate_min: 500000, rate_max: 700000, start_date: "2026-04-01", remote: true, location: null },
    soft_skills: [
      { name: "チームワーク", description: "協調性が高くチームに馴染みやすい" },
      { name: "ドキュメンテーション", description: "技術ドキュメントの作成が得意" },
    ],
  },
  {
    name: "山田美咲",
    email: "yamada@example.com",
    skills: [
      { name: "AWS", level: "expert", years: 9 },
      { name: "Terraform", level: "advanced", years: 6 },
      { name: "Kubernetes", level: "advanced", years: 5 },
    ],
    experience_years: 10,
    industries: ["金融", "製造"],
    availability: { rate_min: 900000, rate_max: 1200000, start_date: "2026-06-01", remote: false, location: "東京" },
    soft_skills: [
      { name: "リーダーシップ", description: "インフラチームのリード" },
      { name: "問題解決力", description: "大規模障害対応の経験" },
      { name: "プレゼン力", description: "経営層への技術提案" },
    ],
  },
  {
    name: "高橋優太",
    email: "takahashi@example.com",
    skills: [
      { name: "Java", level: "expert", years: 13 },
      { name: "Spring Boot", level: "advanced", years: 8 },
      { name: "Oracle", level: "intermediate", years: 5 },
    ],
    experience_years: 15,
    industries: ["金融", "保険"],
    availability: { rate_min: 800000, rate_max: 1100000, start_date: "2026-05-15", remote: false, location: "名古屋" },
    soft_skills: [
      { name: "リーダーシップ", description: "大規模プロジェクトのPM経験" },
      { name: "メンタリング", description: "10名以上のチーム育成" },
    ],
  },
  {
    name: "中村あかり",
    email: "nakamura@example.com",
    skills: [
      { name: "Figma", level: "advanced", years: 4 },
      { name: "React", level: "intermediate", years: 3 },
      { name: "CSS", level: "expert", years: 5 },
    ],
    experience_years: 5,
    industries: ["EC", "メディア"],
    availability: { rate_min: 450000, rate_max: 600000, start_date: "2026-04-01", remote: true, location: "福岡" },
    soft_skills: [
      { name: "コミュニケーション", description: "デザイナーとエンジニアの橋渡し" },
      { name: "プレゼン力", description: "デザインレビューのファシリテーション" },
    ],
  },
  {
    name: "伊藤大輝",
    email: "ito@example.com",
    skills: [
      { name: "Go", level: "advanced", years: 5 },
      { name: "gRPC", level: "intermediate", years: 3 },
      { name: "Kubernetes", level: "intermediate", years: 3 },
    ],
    experience_years: 7,
    industries: ["通信", "SaaS"],
    availability: { rate_min: 700000, rate_max: 900000, start_date: "2026-04-15", remote: true, location: "東京" },
    soft_skills: [
      { name: "問題解決力", description: "パフォーマンスチューニングが得意" },
      { name: "チームワーク", description: "アジャイル開発の経験豊富" },
    ],
  },
  {
    name: "渡辺理沙",
    email: "watanabe@example.com",
    skills: [
      { name: "Flutter", level: "advanced", years: 3 },
      { name: "Dart", level: "advanced", years: 3 },
      { name: "Firebase", level: "intermediate", years: 2 },
    ],
    experience_years: 4,
    industries: ["ヘルスケア", "教育"],
    availability: { rate_min: 500000, rate_max: 650000, start_date: "2026-04-01", remote: true, location: null },
    soft_skills: [
      { name: "コミュニケーション", description: "クライアントとの直接やり取り" },
      { name: "チームワーク", description: "小規模チームでの開発" },
    ],
  },
  {
    name: "木村拓真",
    email: "kimura@example.com",
    skills: [
      { name: "PHP", level: "expert", years: 9 },
      { name: "Laravel", level: "advanced", years: 7 },
      { name: "MySQL", level: "advanced", years: 6 },
    ],
    experience_years: 9,
    industries: ["EC", "不動産"],
    availability: { rate_min: 650000, rate_max: 850000, start_date: "2026-05-01", remote: false, location: "大阪" },
    soft_skills: [
      { name: "問題解決力", description: "レガシーシステムのモダナイズ" },
      { name: "ドキュメンテーション", description: "設計書・仕様書の作成" },
      { name: "メンタリング", description: "後輩エンジニアの技術指導" },
    ],
  },
]

const demoProjects: DemoProject[] = [
  {
    title: "EC サイトリニューアル",
    client_name: "ABC商事",
    required_skills: [
      { name: "React", level: "advanced", years: 4 },
      { name: "TypeScript", level: "intermediate", years: 3 },
      { name: "Next.js", level: "intermediate", years: 2 },
    ],
    experience_years: 5,
    industries: ["EC"],
    conditions: { rate_min: 600000, rate_max: 800000, start_date: "2026-05-01", remote: true, location: "東京" },
    description: "既存ECサイトのNext.js + Headless CMSへの全面リニューアル。レスポンシブ対応、決済連携、在庫管理システムとのAPI連携を含む。",
  },
  {
    title: "金融系 API 基盤構築",
    client_name: "XYZ銀行",
    required_skills: [
      { name: "Python", level: "advanced", years: 5 },
      { name: "AWS", level: "intermediate", years: 3 },
      { name: "Docker", level: "intermediate", years: 2 },
    ],
    experience_years: 7,
    industries: ["金融"],
    conditions: { rate_min: 800000, rate_max: 1000000, start_date: "2026-04-15", remote: false, location: "東京" },
    description: "オープンバンキング対応のRESTful API基盤を構築。認証・認可、レート制限、監査ログを実装。AWS上でのコンテナ運用。",
  },
  {
    title: "クラウドインフラ移行",
    client_name: "DEF製造",
    required_skills: [
      { name: "AWS", level: "advanced", years: 5 },
      { name: "Terraform", level: "intermediate", years: 3 },
      { name: "Kubernetes", level: "intermediate", years: 2 },
    ],
    experience_years: 8,
    industries: ["製造"],
    conditions: { rate_min: 900000, rate_max: 1200000, start_date: "2026-06-01", remote: false, location: "東京" },
    description: "オンプレミス環境からAWSへの段階的移行。IaCによるインフラ構築、CI/CDパイプライン整備、監視体制の構築を含む。",
  },
  {
    title: "保険業務システム刷新",
    client_name: "GHI保険",
    required_skills: [
      { name: "Java", level: "advanced", years: 8 },
      { name: "Spring Boot", level: "intermediate", years: 4 },
      { name: "Oracle", level: "intermediate", years: 3 },
    ],
    experience_years: 10,
    industries: ["保険"],
    conditions: { rate_min: 800000, rate_max: 1100000, start_date: "2026-05-15", remote: false, location: "名古屋" },
    description: "レガシーな保険契約管理システムをSpring Bootベースにリアーキテクト。既存データ移行、帳票出力機能、外部連携APIの実装。",
  },
  {
    title: "メディアサイト新規構築",
    client_name: "JKLメディア",
    required_skills: [
      { name: "React", level: "intermediate", years: 2 },
      { name: "CSS", level: "advanced", years: 3 },
      { name: "Figma", level: "beginner", years: 1 },
    ],
    experience_years: 3,
    industries: ["メディア"],
    conditions: { rate_min: 450000, rate_max: 600000, start_date: "2026-04-01", remote: true, location: null },
    description: "ニュースメディアサイトの新規立ち上げ。CMS連携、SEO最適化、パフォーマンスチューニング。デザインカンプからの実装。",
  },
  {
    title: "マイクロサービス基盤開発",
    client_name: "MNO通信",
    required_skills: [
      { name: "Go", level: "advanced", years: 4 },
      { name: "gRPC", level: "intermediate", years: 2 },
      { name: "Kubernetes", level: "intermediate", years: 2 },
    ],
    experience_years: 5,
    industries: ["通信"],
    conditions: { rate_min: 700000, rate_max: 900000, start_date: "2026-04-15", remote: true, location: "東京" },
    description: "通信プラットフォームのマイクロサービス化。サービスメッシュ導入、gRPCによるサービス間通信、分散トレーシングの実装。",
  },
]

export async function seedDemoData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { data: profile } = await supabase.from("users").select("org_id").eq("id", user.id).single()
  if (!profile) return { error: "ユーザープロフィールが見つかりません" }

  // エンジニア投入
  const engineerRows = demoEngineers.map((e) => ({
    org_id: profile.org_id,
    name: e.name,
    email: e.email,
    skills: e.skills,
    experience_years: e.experience_years,
    industries: e.industries,
    availability: e.availability,
    soft_skills: e.soft_skills,
    raw_text: "",
  }))

  const { data: insertedEngineers, error: engError } = await supabase
    .from("engineers")
    .insert(engineerRows)
    .select("id, name, skills, experience_years, industries, availability, soft_skills")

  if (engError) return { error: `エンジニア投入エラー: ${engError.message}` }

  // エンジニア Embedding 並列生成
  if (insertedEngineers) {
    const embeddingResults = await Promise.allSettled(
      insertedEngineers.map(async (eng) => {
        const embedding = await generateEmbedding({
          name: eng.name,
          skills: eng.skills as Skill[],
          experience_years: eng.experience_years,
          industries: eng.industries,
          availability: eng.availability as Availability,
          soft_skills: eng.soft_skills as SoftSkill[],
        })
        await supabase.from("engineers").update({ embedding }).eq("id", eng.id)
      }),
    )
    const failed = embeddingResults.filter((r) => r.status === "rejected").length
    if (failed > 0) console.warn(`[seedDemoData] ${failed}件のエンジニア Embedding 生成に失敗`)
  }

  // 案件投入
  const projectRows = demoProjects.map((p) => ({
    org_id: profile.org_id,
    title: p.title,
    client_name: p.client_name,
    required_skills: p.required_skills,
    experience_years: p.experience_years,
    industries: p.industries,
    conditions: p.conditions,
    description: p.description,
    status: "open" as const,
  }))

  const { data: insertedProjects, error: projError } = await supabase
    .from("projects")
    .insert(projectRows)
    .select("id, title, client_name, required_skills, experience_years, industries, conditions, description")

  if (projError) return { error: `案件投入エラー: ${projError.message}` }

  // 案件 Embedding 並列生成
  if (insertedProjects) {
    const embeddingResults = await Promise.allSettled(
      insertedProjects.map(async (proj) => {
        const embedding = await generateProjectEmbedding({
          title: proj.title,
          client_name: proj.client_name,
          required_skills: proj.required_skills as Skill[],
          experience_years: proj.experience_years,
          industries: proj.industries,
          conditions: proj.conditions as Availability,
          description: proj.description,
        })
        await supabase.from("projects").update({ embedding }).eq("id", proj.id)
      }),
    )
    const failed = embeddingResults.filter((r) => r.status === "rejected").length
    if (failed > 0) console.warn(`[seedDemoData] ${failed}件の案件 Embedding 生成に失敗`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/engineers")
  revalidatePath("/projects")

  return { success: true, engineers: insertedEngineers?.length ?? 0, projects: insertedProjects?.length ?? 0 }
}
```

- [ ] **Step 2: lint 確認**

Run: `pnpm run check`

- [ ] **Step 3: コミット**

```bash
git add src/actions/seed.ts
git commit -m "feat: デモデータ投入 Server Action を追加"
```

---

### Task 2: SeedDemoButton コンポーネント作成

**Files:**
- Create: `src/components/dashboard/seed-demo-button.tsx`

- [ ] **Step 1: 確認ダイアログ付きボタンコンポーネントを作成**

```typescript
"use client"

import { Loader2, Sparkles } from "lucide-react"
import { useState } from "react"
import { seedDemoData } from "@/actions/seed"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export function SeedDemoButton() {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleSeed() {
    setPending(true)
    setResult(null)

    const res = await seedDemoData()

    setPending(false)

    if (res.error) {
      setResult(`エラー: ${res.error}`)
    } else if (res.success) {
      setResult(`エンジニア${res.engineers}名・案件${res.projects}件を登録しました`)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && <p className="text-sm text-muted-foreground">{result}</p>}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                投入中...
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" />
                デモデータを投入
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>デモデータを投入しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              デモ用のエンジニア9名と案件6件を登録します。Embedding も自動生成されるため、投入後すぐにマッチングを試せます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleSeed}>投入する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

- [ ] **Step 2: AlertDialog コンポーネントが存在するか確認。なければ追加**

Run: `ls src/components/ui/alert-dialog.tsx 2>/dev/null || pnpm dlx shadcn@latest add alert-dialog`

- [ ] **Step 3: lint 確認**

Run: `pnpm run check`

- [ ] **Step 4: コミット**

```bash
git add src/components/dashboard/seed-demo-button.tsx src/components/ui/alert-dialog.tsx
git commit -m "feat: デモデータ投入ボタンコンポーネントを追加"
```

---

### Task 3: ダッシュボードにボタン配置

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: ダッシュボードのヘッダーに SeedDemoButton を配置**

```typescript
import { Briefcase, FileText, Target, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { SeedDemoButton } from "@/components/dashboard/seed-demo-button"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()

  const [engineers, projects, matches, proposals] = await Promise.all([
    supabase.from("engineers").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("matches").select("id", { count: "exact", head: true }),
    supabase.from("proposals").select("id", { count: "exact", head: true }),
  ])

  const stats = [
    { label: "エンジニア", value: engineers.count ?? 0, icon: Users, href: "/engineers" },
    { label: "案件", value: projects.count ?? 0, icon: Briefcase, href: "/projects" },
    { label: "マッチング", value: matches.count ?? 0, icon: Target, href: "/matching" },
    { label: "提案書", value: proposals.count ?? 0, icon: FileText, href: "/proposals" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <SeedDemoButton />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: lint 確認**

Run: `pnpm run check`

- [ ] **Step 3: ビルド確認**

Run: `pnpm run build`

- [ ] **Step 4: コミット**

```bash
git add src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat: ダッシュボードにデモデータ投入ボタンを配置"
```
