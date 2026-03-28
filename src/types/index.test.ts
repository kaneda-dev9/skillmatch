import { describe, expect, it } from "vitest"
import type {
  Availability,
  Document,
  Engineer,
  Match,
  Organization,
  Project,
  Proposal,
  Skill,
  SoftSkill,
  User,
} from "./index"

describe("型定義", () => {
  it("Organization 型がオブジェクトとして使用できる", () => {
    const org: Organization = {
      id: "test-id",
      name: "テスト組織",
      plan: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    }
    expect(org.id).toBe("test-id")
    expect(org.plan).toBeNull()
  })

  it("User 型が role を正しく制約する", () => {
    const user: User = {
      id: "user-id",
      org_id: "org-id",
      email: "test@example.com",
      name: "テストユーザー",
      role: "admin",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    }
    expect(user.role).toBe("admin")
  })

  it("Engineer 型がスキル・稼働条件を含む", () => {
    const skill: Skill = { name: "TypeScript", level: "advanced", years: 5 }
    const availability: Availability = {
      rate_min: 500000,
      rate_max: 800000,
      start_date: "2026-04-01",
      remote: true,
      location: null,
    }
    const softSkill: SoftSkill = { name: "リーダーシップ", description: null }

    const engineer: Engineer = {
      id: "eng-id",
      org_id: "org-id",
      name: "田中太郎",
      email: "tanaka@example.com",
      skills: [skill],
      experience_years: 10,
      industries: ["金融", "EC"],
      availability,
      soft_skills: [softSkill],
      raw_text: "経歴テキスト",
      embedding: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    }
    expect(engineer.skills).toHaveLength(1)
    expect(engineer.industries).toContain("金融")
  })

  it("Project 型が status を正しく制約する", () => {
    const project: Project = {
      id: "proj-id",
      org_id: "org-id",
      title: "テスト案件",
      client_name: "テストクライアント",
      required_skills: [],
      experience_years: 3,
      industries: [],
      conditions: {
        rate_min: null,
        rate_max: null,
        start_date: null,
        remote: false,
        location: null,
      },
      description: "案件説明",
      embedding: null,
      status: "open",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    }
    expect(project.status).toBe("open")
  })

  it("Match 型がスコアフィールドを持つ", () => {
    const match: Match = {
      id: "match-id",
      org_id: "org-id",
      project_id: "proj-id",
      engineer_id: "eng-id",
      overall_score: 85.5,
      skill_score: 90,
      experience_score: 80,
      industry_score: 75,
      condition_score: 95,
      soft_skill_score: 70,
      ai_reasoning: "マッチ理由",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    }
    expect(match.overall_score).toBe(85.5)
  })

  it("Document 型が engineer/project を nullable で持つ", () => {
    const doc: Document = {
      id: "doc-id",
      org_id: "org-id",
      engineer_id: null,
      project_id: null,
      file_name: "resume.pdf",
      file_path: "/uploads/resume.pdf",
      file_type: "application/pdf",
      parsed_content: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    }
    expect(doc.engineer_id).toBeNull()
  })

  it("Proposal 型が match_id を参照する", () => {
    const proposal: Proposal = {
      id: "prop-id",
      org_id: "org-id",
      match_id: "match-id",
      content: "提案書内容",
      format: "markdown",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    }
    expect(proposal.format).toBe("markdown")
  })
})
