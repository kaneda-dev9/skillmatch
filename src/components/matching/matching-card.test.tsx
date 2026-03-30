import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MatchingCard } from "./matching-card"

const mockMatch = {
  id: "1",
  overall_score: 87,
  skill_score: 92,
  experience_score: 85,
  industry_score: 80,
  condition_score: 90,
  soft_skill_score: 88,
  ai_reasoning: "React/TypeScript の実務経験が豊富で、即戦力として期待できる。",
  engineer: {
    id: "e1",
    name: "田中太郎",
    skills: [
      { name: "React", level: "expert" as const, years: 8 },
      { name: "TypeScript", level: "advanced" as const, years: 5 },
    ],
    experience_years: 10,
  },
}

describe("MatchingCard", () => {
  it("エンジニア名と総合スコアを表示する", () => {
    render(<MatchingCard match={mockMatch} />)
    expect(screen.getByText("田中太郎")).toBeDefined()
    expect(screen.getByText("87")).toBeDefined()
  })

  it("項目別スコアをバッジで表示する", () => {
    render(<MatchingCard match={mockMatch} />)
    expect(screen.getByText("技術 92")).toBeDefined()
    expect(screen.getByText("経験 85")).toBeDefined()
    expect(screen.getByText("業界 80")).toBeDefined()
    expect(screen.getByText("条件 90")).toBeDefined()
    expect(screen.getByText("ソフト 88")).toBeDefined()
  })

  it("スコア80以上で緑色のスタイルを適用する", () => {
    render(<MatchingCard match={mockMatch} />)
    const scoreEl = screen.getByText("87")
    expect(scoreEl.className).toContain("bg-green")
  })

  it("スコア60-79で黄色のスタイルを適用する", () => {
    const match = { ...mockMatch, overall_score: 74 }
    render(<MatchingCard match={match} />)
    const scoreEl = screen.getByText("74")
    expect(scoreEl.className).toContain("bg-yellow")
  })

  it("スコア60未満で赤色のスタイルを適用する", () => {
    const match = { ...mockMatch, overall_score: 52 }
    render(<MatchingCard match={match} />)
    const scoreEl = screen.getByText("52")
    expect(scoreEl.className).toContain("bg-red")
  })

  it("主要スキルを表示する", () => {
    render(<MatchingCard match={mockMatch} />)
    expect(screen.getByText(/React/)).toBeDefined()
    expect(screen.getByText(/TypeScript/)).toBeDefined()
  })
})
