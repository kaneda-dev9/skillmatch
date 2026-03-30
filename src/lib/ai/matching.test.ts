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
    description: "ECサイトのフロントエンド刷新プロジェクト",
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
