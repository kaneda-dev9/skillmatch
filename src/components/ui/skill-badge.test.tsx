import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SkillBadge } from "./skill-badge"

describe("SkillBadge", () => {
  it("スキル名を表示する", () => {
    render(<SkillBadge name="React" />)
    expect(screen.getByText("React")).toBeDefined()
  })

  it("未登録スキルもレンダリングされる", () => {
    render(<SkillBadge name="Unknown" />)
    expect(screen.getByText("Unknown")).toBeDefined()
  })
})
