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

export const engineerParseSchema = z.object({
  name: z.string(),
  email: z.string().nullable(),
  skills: z.array(skillSchema),
  experience_years: z.number(),
  industries: z.array(z.string()),
  availability: availabilitySchema,
  soft_skills: z.array(softSkillSchema),
})

export type EngineerFormData = z.infer<typeof engineerFormSchema>
export type EngineerParseData = z.infer<typeof engineerParseSchema>
