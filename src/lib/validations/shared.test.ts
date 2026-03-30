import { describe, expect, it } from "vitest"
import { availabilitySchema, matchEvaluationSchema, skillSchema } from "./shared"

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
