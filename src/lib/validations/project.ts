import { z } from "zod/v4"
import { AVAILABILITY_DEFAULTS, availabilitySchema, skillSchema } from "./shared"

export const projectFormSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  client_name: z.string().min(1, "クライアント名は必須です"),
  required_skills: z.array(skillSchema).default([]),
  experience_years: z.number().min(0).default(0),
  industries: z.array(z.string()).default([]),
  conditions: availabilitySchema.default(AVAILABILITY_DEFAULTS),
  description: z.string().default(""),
  status: z.enum(["open", "closed"]).default("open"),
})

export type ProjectFormData = z.infer<typeof projectFormSchema>
