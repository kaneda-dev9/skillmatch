import { describe, expect, it } from "vitest"
import { getSkillColor } from "./skill-colors"

describe("getSkillColor", () => {
  it("登録済みスキルの色を返す", () => {
    const color = getSkillColor("React")
    expect(color.text).toBe("#61dafb")
    expect(color.bg).toBe("#61dafb18")
    expect(color.border).toBe("#61dafb40")
  })

  it("未登録スキルはデフォルトのティール色を返す", () => {
    const color = getSkillColor("UnknownSkill")
    expect(color.text).toBe("#0d9488")
  })

  it("大文字小文字が一致すれば色を返す", () => {
    const color = getSkillColor("TypeScript")
    expect(color.text).toBe("#3178c6")
  })
})
