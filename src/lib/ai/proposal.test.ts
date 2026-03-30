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
    soft_skills: [{ name: "リーダーシップ", description: "5名チームのリーダー経験" }],
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
