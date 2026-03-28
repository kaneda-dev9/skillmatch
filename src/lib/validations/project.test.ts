import { describe, expect, it } from "vitest"
import { projectFormSchema } from "./project"

describe("projectFormSchema", () => {
  it("有効なデータを通す", () => {
    const data = {
      title: "React フロントエンド開発",
      client_name: "株式会社テスト",
      required_skills: [{ name: "React", level: "advanced", years: 3 }],
      experience_years: 5,
      industries: ["EC"],
      conditions: {
        rate_min: 600000,
        rate_max: 900000,
        start_date: "2026-05-01",
        remote: true,
        location: null,
      },
      description: "ECサイトのフロントエンド開発",
      status: "open",
    }
    expect(projectFormSchema.safeParse(data).success).toBe(true)
  })
  it("タイトルが空の場合エラー", () => {
    expect(
      projectFormSchema.safeParse({ title: "", client_name: "テスト", experience_years: 0 })
        .success,
    ).toBe(false)
  })
  it("クライアント名が空の場合エラー", () => {
    expect(
      projectFormSchema.safeParse({ title: "テスト", client_name: "", experience_years: 0 })
        .success,
    ).toBe(false)
  })
  it("不正ステータスを拒否", () => {
    expect(
      projectFormSchema.safeParse({
        title: "T",
        client_name: "C",
        experience_years: 0,
        status: "pending",
      }).success,
    ).toBe(false)
  })
  it("デフォルト値が適用される", () => {
    const result = projectFormSchema.safeParse({ title: "テスト案件", client_name: "テスト社" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe("open")
      expect(result.data.required_skills).toEqual([])
    }
  })
})
