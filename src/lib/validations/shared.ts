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

export const AVAILABILITY_DEFAULTS = {
  rate_min: null,
  rate_max: null,
  start_date: null,
  remote: false,
  location: null,
} as const
