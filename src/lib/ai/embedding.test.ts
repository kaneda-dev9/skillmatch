import { describe, expect, it } from "vitest"
import { buildEmbeddingText, buildProjectEmbeddingText } from "./embedding"

describe("buildEmbeddingText", () => {
  it("エンジニア情報からEmbedding用テキストを生成する", () => {
    const engineer = {
      name: "田中太郎",
      skills: [
        { name: "TypeScript", level: "advanced" as const, years: 5 },
        { name: "React", level: "expert" as const, years: 8 },
      ],
      experience_years: 10,
      industries: ["金融", "EC"],
      availability: {
        rate_min: 500000,
        rate_max: 800000,
        start_date: null,
        remote: true,
        location: null,
      },
      soft_skills: [{ name: "リーダーシップ", description: null }],
    }
    const text = buildEmbeddingText(engineer)
    expect(text).toContain("TypeScript")
    expect(text).toContain("React")
    expect(text).toContain("金融")
    expect(text).toContain("リーダーシップ")
    expect(text).toContain("リモート可")
  })
})

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
    expect(text).toContain("EC")
    expect(text).toContain("リモート可")
    expect(text).toContain("ECサイト")
  })
})
