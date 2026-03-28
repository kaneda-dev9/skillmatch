import { z } from "zod/v4"
import { AVAILABILITY_DEFAULTS, availabilitySchema, skillSchema } from "./shared"

const softSkillSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().default(null),
})

export const engineerFormSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email().nullable().optional().default(null),
  skills: z.array(skillSchema).default([]),
  experience_years: z.number().min(0).default(0),
  industries: z.array(z.string()).default([]),
  availability: availabilitySchema.default(AVAILABILITY_DEFAULTS),
  soft_skills: z.array(softSkillSchema).default([]),
})

// AI 出力用スキーマ（Anthropic API が minimum/minLength 非対応のため制約なし）
const parseSkillSchema = z.object({
  name: z.string(),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  years: z.number(),
})

const parseSoftSkillSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
})

export const engineerParseSchema = z.object({
  name: z.string(),
  email: z.string().nullable(),
  skills: z.array(parseSkillSchema),
  experience_years: z.number(),
  industries: z.array(z.string()),
  availability: z.object({
    rate_min: z.number().nullable(),
    rate_max: z.number().nullable(),
    start_date: z.string().nullable(),
    remote: z.boolean(),
    location: z.string().nullable(),
  }),
  soft_skills: z.array(parseSoftSkillSchema),
})

export type EngineerFormData = z.infer<typeof engineerFormSchema>
export type EngineerParseData = z.infer<typeof engineerParseSchema>
