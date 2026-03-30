import { streamText } from "ai"
import { buildProposalPrompt } from "@/lib/ai/proposal"
import { llm } from "@/lib/ai/provider"
import { createClient } from "@/lib/supabase/server"
import type { Availability, Skill, SoftSkill } from "@/types"

export async function POST(request: Request) {
  const { matchId } = await request.json()

  if (!matchId) {
    return Response.json({ error: "matchId is required" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "認証が必要です" }, { status: 401 })
  }

  // match + engineer + project を取得
  const { data: match } = await supabase
    .from("matches")
    .select("*, engineer:engineers(*), project:projects(*)")
    .eq("id", matchId)
    .single()

  if (!match) {
    return Response.json({ error: "マッチング結果が見つかりません" }, { status: 404 })
  }

  const project = {
    title: match.project.title,
    client_name: match.project.client_name,
    required_skills: match.project.required_skills as Skill[],
    experience_years: match.project.experience_years,
    industries: match.project.industries,
    conditions: match.project.conditions as Availability,
    description: match.project.description,
  }

  const engineer = {
    name: match.engineer.name,
    skills: match.engineer.skills as Skill[],
    experience_years: match.engineer.experience_years,
    industries: match.engineer.industries,
    availability: match.engineer.availability as Availability,
    soft_skills: match.engineer.soft_skills as SoftSkill[],
  }

  const matchData = {
    overall_score: match.overall_score,
    skill_score: match.skill_score,
    experience_score: match.experience_score,
    industry_score: match.industry_score,
    condition_score: match.condition_score,
    soft_skill_score: match.soft_skill_score,
    ai_reasoning: match.ai_reasoning,
  }

  const prompt = buildProposalPrompt(project, engineer, matchData)

  const result = streamText({
    model: llm,
    messages: [{ role: "user", content: prompt }],
  })

  return result.toDataStreamResponse()
}
