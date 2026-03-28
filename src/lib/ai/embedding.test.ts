import { describe, expect, it } from "vitest"
import { buildEmbeddingText } from "./embedding"

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
