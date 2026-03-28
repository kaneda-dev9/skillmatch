"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { generateProjectEmbedding } from "@/lib/ai/embedding"
import { createClient } from "@/lib/supabase/server"
import { projectFormSchema } from "@/lib/validations/project"

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { data: profile } = await supabase.from("users").select("org_id").eq("id", user.id).single()
  if (!profile) return { error: "ユーザープロフィールが見つかりません" }

  const raw = JSON.parse(formData.get("data") as string)
  const parsed = projectFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: "入力内容に不備があります" }
  }

  const projectData = parsed.data

  let embedding: number[] | null = null
  try {
    embedding = await generateProjectEmbedding(projectData)
  } catch {
    // Embedding 生成失敗 — 後でリトライ可能
  }

  const { error } = await supabase.from("projects").insert({
    org_id: profile.org_id,
    title: projectData.title,
    client_name: projectData.client_name,
    required_skills: projectData.required_skills,
    experience_years: projectData.experience_years,
    industries: projectData.industries,
    conditions: projectData.conditions,
    description: projectData.description,
    status: projectData.status,
    embedding,
  })

  if (error) return { error: error.message }

  revalidatePath("/projects")
  redirect("/projects")
}

export async function updateProject(id: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const raw = JSON.parse(formData.get("data") as string)
  const parsed = projectFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: "入力内容に不備があります" }
  }

  const projectData = parsed.data

  let embedding: number[] | null = null
  try {
    embedding = await generateProjectEmbedding(projectData)
  } catch {
    // Embedding 生成失敗
  }

  const { error } = await supabase
    .from("projects")
    .update({
      title: projectData.title,
      client_name: projectData.client_name,
      required_skills: projectData.required_skills,
      experience_years: projectData.experience_years,
      industries: projectData.industries,
      conditions: projectData.conditions,
      description: projectData.description,
      status: projectData.status,
      embedding,
    })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/projects")
  revalidatePath(`/projects/${id}`)
  redirect(`/projects/${id}`)
}

export async function deleteProject(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { error } = await supabase.from("projects").delete().eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/projects")
  redirect("/projects")
}

export async function toggleProjectStatus(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { data: project } = await supabase.from("projects").select("status").eq("id", id).single()

  if (!project) return { error: "案件が見つかりません" }

  const newStatus = project.status === "open" ? "closed" : "open"

  const { error } = await supabase.from("projects").update({ status: newStatus }).eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/projects")
  revalidatePath(`/projects/${id}`)
}
