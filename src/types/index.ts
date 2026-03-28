export type UserRole = "admin" | "member"
export type ProjectStatus = "open" | "closed"

export interface Organization {
  id: string
  name: string
  plan: string | null
  created_at: string
}

export interface User {
  id: string
  org_id: string
  email: string
  name: string
  role: UserRole
  created_at: string
}

export interface Engineer {
  id: string
  org_id: string
  name: string
  email: string | null
  skills: Skill[]
  experience_years: number
  industries: string[]
  availability: Availability
  soft_skills: SoftSkill[]
  raw_text: string
  embedding: number[] | null
  created_at: string
}

export interface Skill {
  name: string
  level: "beginner" | "intermediate" | "advanced" | "expert"
  years: number
}

export interface Availability {
  rate_min: number | null
  rate_max: number | null
  start_date: string | null
  remote: boolean
  location: string | null
}

export interface SoftSkill {
  name: string
  description: string | null
}

export interface Project {
  id: string
  org_id: string
  title: string
  client_name: string
  required_skills: Skill[]
  experience_years: number
  industries: string[]
  conditions: Availability
  description: string
  embedding: number[] | null
  status: ProjectStatus
  created_at: string
}

export interface Match {
  id: string
  org_id: string
  project_id: string
  engineer_id: string
  overall_score: number
  skill_score: number
  experience_score: number
  industry_score: number
  condition_score: number
  soft_skill_score: number
  ai_reasoning: string
  created_at: string
}

export interface Document {
  id: string
  org_id: string
  engineer_id: string | null
  project_id: string | null
  file_name: string
  file_path: string
  file_type: string
  parsed_content: string | null
  created_at: string
}

export interface Proposal {
  id: string
  org_id: string
  match_id: string
  content: string
  format: string
  created_at: string
}
