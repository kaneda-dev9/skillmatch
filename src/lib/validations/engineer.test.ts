import { describe, expect, it } from "vitest"
import { engineerFormSchema, engineerParseSchema } from "./engineer"

describe("engineerFormSchema", () => {
  it("有効なデータを通す", () => {
    const data = {
      name: "田中太郎",
      email: "tanaka@example.com",
      skills: [{ name: "TypeScript", level: "advanced", years: 5 }],
      experience_years: 10,
      industries: ["金融"],
      availability: {
        rate_min: 500000,
        rate_max: 800000,
        start_date: "2026-04-01",
        remote: true,
        location: null,
      },
      soft_skills: [{ name: "リーダーシップ", description: null }],
    }
    const result = engineerFormSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it("名前が空の場合エラー", () => {
    const data = { name: "", skills: [], experience_years: 0 }
    const result = engineerFormSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it("スキルレベルが不正な場合エラー", () => {
    const data = {
      name: "テスト",
      skills: [{ name: "JS", level: "master", years: 1 }],
      experience_years: 1,
    }
    const result = engineerFormSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe("engineerParseSchema", () => {
  it("Claude の構造化出力を検証する", () => {
    const data = {
      name: "田中太郎",
      email: null,
      skills: [{ name: "React", level: "expert", years: 8 }],
      experience_years: 12,
      industries: ["EC", "金融"],
      availability: {
        rate_min: null,
        rate_max: null,
        start_date: null,
        remote: false,
        location: "東京",
      },
      soft_skills: [],
    }
    const result = engineerParseSchema.safeParse(data)
    expect(result.success).toBe(true)
  })
})
