"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { evaluateEngineer } from "@/lib/ai/matching"
import { createClient } from "@/lib/supabase/server"
import type { Availability, Skill, SoftSkill } from "@/types"

export async function executeMatching(projectId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { data: profile } = await supabase.from("users").select("org_id").eq("id", user.id).single()
  if (!profile) return { error: "ユーザープロフィールが見つかりません" }

  // 案件を取得
  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single()

  if (!project) return { error: "案件が見つかりません" }
  if (!project.embedding) {
    return { error: "案件の Embedding が未生成です。案件を編集して保存し直してください。" }
  }

  // pgvector で上位10件のエンジニアを取得
  const { data: candidates, error: rpcError } = await supabase.rpc("match_engineers", {
    query_embedding: project.embedding,
    match_org_id: profile.org_id,
    match_count: 10,
  })

  if (rpcError) return { error: rpcError.message }
  if (!candidates || candidates.length === 0) {
    return { error: "条件に合うエンジニアが見つかりませんでした。エンジニアを登録してください。" }
  }

  // Claude で個別評価（並列実行）
  const projectForEval = {
    title: project.title,
    client_name: project.client_name,
    required_skills: project.required_skills as Skill[],
    experience_years: project.experience_years,
    industries: project.industries,
    conditions: project.conditions as Availability,
    description: project.description,
  }

  const evaluations = await Promise.allSettled(
    candidates.map(
      (engineer: {
        id: string
        name: string
        skills: unknown
        experience_years: number
        industries: string[]
        availability: unknown
        soft_skills: unknown
      }) =>
        evaluateEngineer(projectForEval, {
          name: engineer.name,
          skills: engineer.skills as Skill[],
          experience_years: engineer.experience_years,
          industries: engineer.industries,
          availability: engineer.availability as Availability,
          soft_skills: engineer.soft_skills as SoftSkill[],
        }).then((evaluation) => ({
          engineer_id: engineer.id,
          evaluation,
        })),
    ),
  )

  type EvalResult = {
    engineer_id: string
    evaluation: Awaited<ReturnType<typeof evaluateEngineer>>
  }
  const successfulResults = evaluations
    .filter((r): r is PromiseFulfilledResult<EvalResult> => r.status === "fulfilled")
    .map((r) => r.value)

  if (successfulResults.length === 0) {
    return { error: "マッチング評価に失敗しました。しばらく待ってから再試行してください。" }
  }

  // 既存結果を削除（proposals は ON DELETE CASCADE で自動削除）
  await supabase.from("matches").delete().eq("project_id", projectId)

  // 新しい結果を挿入
  const matchRows = successfulResults.map((r) => ({
    org_id: profile.org_id,
    project_id: projectId,
    engineer_id: r.engineer_id,
    overall_score: r.evaluation.overall_score,
    skill_score: r.evaluation.skill_score,
    experience_score: r.evaluation.experience_score,
    industry_score: r.evaluation.industry_score,
    condition_score: r.evaluation.condition_score,
    soft_skill_score: r.evaluation.soft_skill_score,
    ai_reasoning: r.evaluation.ai_reasoning,
  }))

  const { error: insertError } = await supabase.from("matches").insert(matchRows)
  if (insertError) return { error: insertError.message }

  revalidatePath("/matching")
  revalidatePath(`/matching/${projectId}`)
  redirect(`/matching/${projectId}`)
}

export async function getMatchResults(projectId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "認証が必要です" }

  const { data, error } = await supabase
    .from("matches")
    .select("*, engineer:engineers(*)")
    .eq("project_id", projectId)
    .order("overall_score", { ascending: false })

  if (error) return { data: null, error: error.message }

  return { data, error: null }
}
