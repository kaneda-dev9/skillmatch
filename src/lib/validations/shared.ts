import { z } from "zod/v4"

export const skillSchema = z.object({
  name: z.string().min(1),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  years: z.number().min(0),
})

export const availabilitySchema = z.object({
  rate_min: z.number().nullable().default(null),
  rate_max: z.number().nullable().default(null),
  start_date: z.string().nullable().default(null),
  remote: z.boolean().default(false),
  location: z.string().nullable().default(null),
})

// Claude API の構造化出力は integer の min/max 非対応のため、制約なしで定義
// スコア範囲（0-100）はプロンプトで指示
export const matchEvaluationSchema = z.object({
  overall_score: z.number(),
  skill_score: z.number(),
  experience_score: z.number(),
  industry_score: z.number(),
  condition_score: z.number(),
  soft_skill_score: z.number(),
  ai_reasoning: z.string(),
})

export type MatchEvaluation = z.infer<typeof matchEvaluationSchema>

export const AVAILABILITY_DEFAULTS = {
  rate_min: null,
  rate_max: null,
  start_date: null,
  remote: false,
  location: null,
} as const
