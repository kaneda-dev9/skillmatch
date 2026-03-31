"use server"

import { revalidatePath } from "next/cache"
import { generateEmbedding, generateProjectEmbedding } from "@/lib/ai/embedding"
import { createClient } from "@/lib/supabase/server"
import type { Availability, Skill, SoftSkill } from "@/types"

// --- デモエンジニアデータ ---

interface DemoEngineer {
  name: string
  skills: Skill[]
  experience_years: number
  industries: string[]
  availability: Availability
  soft_skills: SoftSkill[]
}

const DEMO_ENGINEERS: DemoEngineer[] = [
  {
    name: "田中太郎",
    skills: [
      { name: "React", level: "advanced", years: 5 },
      { name: "TypeScript", level: "advanced", years: 5 },
      { name: "Next.js", level: "intermediate", years: 3 },
    ],
    experience_years: 8,
    industries: ["EC", "SaaS"],
    availability: {
      rate_min: 600000,
      rate_max: 800000,
      start_date: null,
      remote: true,
      location: "東京",
    },
    soft_skills: [
      { name: "リーダーシップ", description: null },
      { name: "コミュニケーション", description: null },
      { name: "問題解決力", description: null },
    ],
  },
  {
    name: "鈴木花子",
    skills: [
      { name: "Python", level: "expert", years: 10 },
      { name: "AWS", level: "advanced", years: 8 },
      { name: "Docker", level: "intermediate", years: 4 },
    ],
    experience_years: 12,
    industries: ["金融", "ヘルスケア"],
    availability: {
      rate_min: 800000,
      rate_max: 1000000,
      start_date: null,
      remote: true,
      location: "大阪",
    },
    soft_skills: [
      { name: "メンタリング", description: null },
      { name: "問題解決力", description: null },
      { name: "ドキュメンテーション", description: null },
    ],
  },
  {
    name: "佐藤健一",
    skills: [
      { name: "React", level: "intermediate", years: 3 },
      { name: "Node.js", level: "advanced", years: 5 },
      { name: "PostgreSQL", level: "advanced", years: 5 },
    ],
    experience_years: 6,
    industries: ["SaaS", "教育"],
    availability: {
      rate_min: 500000,
      rate_max: 700000,
      start_date: null,
      remote: true,
      location: null,
    },
    soft_skills: [
      { name: "チームワーク", description: null },
      { name: "コミュニケーション", description: null },
    ],
  },
  {
    name: "山田美咲",
    skills: [
      { name: "AWS", level: "expert", years: 9 },
      { name: "Terraform", level: "advanced", years: 6 },
      { name: "Kubernetes", level: "advanced", years: 5 },
    ],
    experience_years: 10,
    industries: ["金融", "製造"],
    availability: {
      rate_min: 900000,
      rate_max: 1200000,
      start_date: null,
      remote: false,
      location: "東京",
    },
    soft_skills: [
      { name: "リーダーシップ", description: null },
      { name: "プレゼン力", description: null },
      { name: "問題解決力", description: null },
    ],
  },
  {
    name: "高橋優太",
    skills: [
      { name: "Java", level: "expert", years: 13 },
      { name: "Spring Boot", level: "advanced", years: 8 },
      { name: "Oracle", level: "intermediate", years: 5 },
    ],
    experience_years: 15,
    industries: ["金融", "保険"],
    availability: {
      rate_min: 800000,
      rate_max: 1100000,
      start_date: null,
      remote: false,
      location: "名古屋",
    },
    soft_skills: [
      { name: "メンタリング", description: null },
      { name: "ドキュメンテーション", description: null },
      { name: "リーダーシップ", description: null },
    ],
  },
  {
    name: "中村あかり",
    skills: [
      { name: "Figma", level: "advanced", years: 4 },
      { name: "React", level: "intermediate", years: 3 },
      { name: "CSS", level: "expert", years: 5 },
    ],
    experience_years: 5,
    industries: ["EC", "メディア"],
    availability: {
      rate_min: 450000,
      rate_max: 600000,
      start_date: null,
      remote: true,
      location: "福岡",
    },
    soft_skills: [
      { name: "コミュニケーション", description: null },
      { name: "チームワーク", description: null },
    ],
  },
  {
    name: "伊藤大輝",
    skills: [
      { name: "Go", level: "advanced", years: 5 },
      { name: "gRPC", level: "intermediate", years: 3 },
      { name: "Kubernetes", level: "intermediate", years: 3 },
    ],
    experience_years: 7,
    industries: ["通信", "SaaS"],
    availability: {
      rate_min: 700000,
      rate_max: 900000,
      start_date: null,
      remote: true,
      location: "東京",
    },
    soft_skills: [
      { name: "問題解決力", description: null },
      { name: "チームワーク", description: null },
      { name: "ドキュメンテーション", description: null },
    ],
  },
  {
    name: "渡辺理沙",
    skills: [
      { name: "Flutter", level: "advanced", years: 3 },
      { name: "Dart", level: "advanced", years: 3 },
      { name: "Firebase", level: "intermediate", years: 2 },
    ],
    experience_years: 4,
    industries: ["ヘルスケア", "教育"],
    availability: {
      rate_min: 500000,
      rate_max: 650000,
      start_date: null,
      remote: true,
      location: null,
    },
    soft_skills: [
      { name: "コミュニケーション", description: null },
      { name: "プレゼン力", description: null },
    ],
  },
  {
    name: "木村拓真",
    skills: [
      { name: "PHP", level: "expert", years: 9 },
      { name: "Laravel", level: "advanced", years: 7 },
      { name: "MySQL", level: "advanced", years: 6 },
    ],
    experience_years: 9,
    industries: ["EC", "不動産"],
    availability: {
      rate_min: 650000,
      rate_max: 850000,
      start_date: null,
      remote: false,
      location: "大阪",
    },
    soft_skills: [
      { name: "リーダーシップ", description: null },
      { name: "メンタリング", description: null },
      { name: "問題解決力", description: null },
    ],
  },
]

// --- デモプロジェクトデータ ---

interface DemoProject {
  title: string
  client_name: string
  required_skills: Skill[]
  experience_years: number
  industries: string[]
  conditions: Availability
  description: string
}

const DEMO_PROJECTS: DemoProject[] = [
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
    conditions: {
      rate_min: 600000,
      rate_max: 800000,
      start_date: null,
      remote: true,
      location: "東京",
    },
    description:
      "既存ECサイトのNext.js + Headless CMSへの全面リニューアル。レスポンシブ対応、決済連携、在庫管理システムとのAPI連携を含む。",
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
    conditions: {
      rate_min: 800000,
      rate_max: 1000000,
      start_date: null,
      remote: false,
      location: "東京",
    },
    description:
      "オープンバンキング対応のRESTful API基盤を構築。認証・認可、レート制限、監査ログを実装。AWS上でのコンテナ運用。",
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
    conditions: {
      rate_min: 900000,
      rate_max: 1200000,
      start_date: null,
      remote: false,
      location: "東京",
    },
    description:
      "オンプレミス環境からAWSへの段階的移行。IaCによるインフラ構築、CI/CDパイプライン整備、監視体制の構築を含む。",
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
    conditions: {
      rate_min: 800000,
      rate_max: 1100000,
      start_date: null,
      remote: false,
      location: "名古屋",
    },
    description:
      "レガシーな保険契約管理システムをSpring Bootベースにリアーキテクト。既存データ移行、帳票出力機能、外部連携APIの実装。",
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
    conditions: {
      rate_min: 450000,
      rate_max: 600000,
      start_date: null,
      remote: true,
      location: null,
    },
    description:
      "ニュースメディアサイトの新規立ち上げ。CMS連携、SEO最適化、パフォーマンスチューニング。デザインカンプからの実装。",
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
    conditions: {
      rate_min: 700000,
      rate_max: 900000,
      start_date: null,
      remote: true,
      location: "東京",
    },
    description:
      "通信プラットフォームのマイクロサービス化。サービスメッシュ導入、gRPCによるサービス間通信、分散トレーシングの実装。",
  },
]

// --- Server Action ---

export async function seedDemoData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { data: profile } = await supabase.from("users").select("org_id").eq("id", user.id).single()
  if (!profile) return { error: "ユーザープロフィールが見つかりません" }

  const orgId = profile.org_id

  try {
    // エンジニアの挿入
    const engineerInserts = DEMO_ENGINEERS.map((eng) => ({
      org_id: orgId,
      name: eng.name,
      email: null,
      skills: eng.skills,
      experience_years: eng.experience_years,
      industries: eng.industries,
      availability: eng.availability,
      soft_skills: eng.soft_skills,
      raw_text: "",
      embedding: null,
    }))

    const { data: insertedEngineers, error: engError } = await supabase
      .from("engineers")
      .insert(engineerInserts)
      .select("id, name")

    if (engError) return { error: `エンジニア挿入エラー: ${engError.message}` }

    // エンジニアの埋め込みベクトルを並列生成
    const engineerEmbeddingResults = await Promise.allSettled(
      DEMO_ENGINEERS.map((eng) => generateEmbedding(eng)),
    )

    // 生成成功した埋め込みベクトルを更新
    for (let i = 0; i < engineerEmbeddingResults.length; i++) {
      const result = engineerEmbeddingResults[i]
      if (result.status === "fulfilled" && insertedEngineers?.[i]) {
        await supabase
          .from("engineers")
          .update({ embedding: result.value })
          .eq("id", insertedEngineers[i].id)
          .eq("org_id", orgId)
      }
    }

    // プロジェクトの挿入
    const projectInserts = DEMO_PROJECTS.map((proj) => ({
      org_id: orgId,
      title: proj.title,
      client_name: proj.client_name,
      required_skills: proj.required_skills,
      experience_years: proj.experience_years,
      industries: proj.industries,
      conditions: proj.conditions,
      description: proj.description,
      status: "open" as const,
      embedding: null,
    }))

    const { data: insertedProjects, error: projError } = await supabase
      .from("projects")
      .insert(projectInserts)
      .select("id, title")

    if (projError) return { error: `プロジェクト挿入エラー: ${projError.message}` }

    // プロジェクトの埋め込みベクトルを並列生成
    const projectEmbeddingResults = await Promise.allSettled(
      DEMO_PROJECTS.map((proj) => generateProjectEmbedding(proj)),
    )

    // 生成成功した埋め込みベクトルを更新
    for (let i = 0; i < projectEmbeddingResults.length; i++) {
      const result = projectEmbeddingResults[i]
      if (result.status === "fulfilled" && insertedProjects?.[i]) {
        await supabase
          .from("projects")
          .update({ embedding: result.value })
          .eq("id", insertedProjects[i].id)
          .eq("org_id", orgId)
      }
    }

    revalidatePath("/dashboard")
    revalidatePath("/engineers")
    revalidatePath("/projects")

    return {
      success: true,
      engineers: insertedEngineers?.length ?? 0,
      projects: insertedProjects?.length ?? 0,
    }
  } catch (e) {
    console.error("[seedDemoData] エラー:", e)
    return { error: "デモデータの投入に失敗しました" }
  }
}
