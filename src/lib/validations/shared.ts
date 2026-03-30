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

const scoreField = z.number().int().min(0).max(100)

export const matchEvaluationSchema = z.object({
  overall_score: scoreField,
  skill_score: scoreField,
  experience_score: scoreField,
  industry_score: scoreField,
  condition_score: scoreField,
  soft_skill_score: scoreField,
  ai_reasoning: z.string().min(1),
})

export type MatchEvaluation = z.infer<typeof matchEvaluationSchema>

export const AVAILABILITY_DEFAULTS = {
  rate_min: null,
  rate_max: null,
  start_date: null,
  remote: false,
  location: null,
} as const
