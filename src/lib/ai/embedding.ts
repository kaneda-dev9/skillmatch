import { embed } from "ai"
import type { EngineerFormData } from "@/lib/validations/engineer"
import type { ProjectFormData } from "@/lib/validations/project"
import { embeddingModel } from "./provider"

type EmbeddingInput = Pick<
  EngineerFormData,
  "name" | "skills" | "experience_years" | "industries" | "availability" | "soft_skills"
>

export function buildEmbeddingText(engineer: EmbeddingInput): string {
  const parts: string[] = []

  parts.push(`名前: ${engineer.name}`)
  parts.push(`経験年数: ${engineer.experience_years}年`)

  if (engineer.skills.length > 0) {
    const skillTexts = engineer.skills.map((s) => `${s.name}(${s.level}, ${s.years}年)`)
    parts.push(`スキル: ${skillTexts.join(", ")}`)
  }

  if (engineer.industries.length > 0) {
    parts.push(`業界: ${engineer.industries.join(", ")}`)
  }

  if (engineer.availability) {
    const avail = engineer.availability
    const conditions: string[] = []
    if (avail.rate_min || avail.rate_max) {
      conditions.push(`単価: ${avail.rate_min ?? "?"}〜${avail.rate_max ?? "?"}`)
    }
    if (avail.remote) conditions.push("リモート可")
    if (avail.location) conditions.push(`勤務地: ${avail.location}`)
    if (avail.start_date) conditions.push(`稼働開始: ${avail.start_date}`)
    if (conditions.length > 0) {
      parts.push(`稼働条件: ${conditions.join(", ")}`)
    }
  }

  if (engineer.soft_skills.length > 0) {
    parts.push(`ソフトスキル: ${engineer.soft_skills.map((s) => s.name).join(", ")}`)
  }

  return parts.join("\n")
}

export async function generateEmbedding(engineer: EmbeddingInput): Promise<number[]> {
  const text = buildEmbeddingText(engineer)
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  })
  return embedding
}

type ProjectEmbeddingInput = Pick<
  ProjectFormData,
  | "title"
  | "client_name"
  | "required_skills"
  | "experience_years"
  | "industries"
  | "conditions"
  | "description"
>

export function buildProjectEmbeddingText(project: ProjectEmbeddingInput): string {
  const parts: string[] = []
  parts.push(`案件: ${project.title}`)
  parts.push(`クライアント: ${project.client_name}`)
  parts.push(`必要経験年数: ${project.experience_years}年`)
  if (project.required_skills.length > 0) {
    const skillTexts = project.required_skills.map((s) => `${s.name}(${s.level}, ${s.years}年)`)
    parts.push(`要求スキル: ${skillTexts.join(", ")}`)
  }
  if (project.industries.length > 0) {
    parts.push(`業界: ${project.industries.join(", ")}`)
  }
  if (project.conditions) {
    const cond = project.conditions
    const conditions: string[] = []
    if (cond.rate_min || cond.rate_max)
      conditions.push(`単価: ${cond.rate_min ?? "?"}〜${cond.rate_max ?? "?"}`)
    if (cond.remote) conditions.push("リモート可")
    if (cond.location) conditions.push(`勤務地: ${cond.location}`)
    if (cond.start_date) conditions.push(`稼働開始: ${cond.start_date}`)
    if (conditions.length > 0) parts.push(`条件: ${conditions.join(", ")}`)
  }
  if (project.description) parts.push(`説明: ${project.description}`)
  return parts.join("\n")
}

export async function generateProjectEmbedding(project: ProjectEmbeddingInput): Promise<number[]> {
  const text = buildProjectEmbeddingText(project)
  const { embedding } = await embed({ model: embeddingModel, value: text })
  return embedding
}
