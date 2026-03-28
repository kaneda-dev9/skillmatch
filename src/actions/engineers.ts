"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { generateEmbedding } from "@/lib/ai/embedding"
import { parseDocumentWithAI } from "@/lib/ai/parse-document"
import { createClient } from "@/lib/supabase/server"
import { engineerFormSchema } from "@/lib/validations/engineer"

export async function parseDocument(formData: FormData) {
  const file = formData.get("file") as File
  if (!file) return { error: "ファイルが選択されていません" }

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]

  if (!allowedTypes.includes(file.type)) {
    return { error: "PDF、Word、Excel ファイルのみ対応しています" }
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: "ファイルサイズは10MB以下にしてください" }
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const { data, rawText } = await parseDocumentWithAI(buffer, file.type, file.name)
    return { data, rawText, fileName: file.name, fileType: file.type }
  } catch {
    return { error: "ファイルの解析に失敗しました。手動で入力してください。" }
  }
}

export async function createEngineer(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { data: profile } = await supabase.from("users").select("org_id").eq("id", user.id).single()
  if (!profile) return { error: "ユーザープロフィールが見つかりません" }

  const raw = JSON.parse(formData.get("data") as string)
  const parsed = engineerFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: "入力内容に不備があります" }
  }

  const engineerData = parsed.data
  const rawText = (formData.get("rawText") as string) ?? ""

  let embedding: number[] | null = null
  try {
    embedding = await generateEmbedding(engineerData)
  } catch {
    // Embedding 生成失敗 — 後でリトライ可能
  }

  const { data: engineer, error } = await supabase
    .from("engineers")
    .insert({
      org_id: profile.org_id,
      name: engineerData.name,
      email: engineerData.email,
      skills: engineerData.skills,
      experience_years: engineerData.experience_years,
      industries: engineerData.industries,
      availability: engineerData.availability,
      soft_skills: engineerData.soft_skills,
      raw_text: rawText,
      embedding,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  const fileName = formData.get("fileName") as string | null
  const filePath = formData.get("filePath") as string | null
  const fileType = formData.get("fileType") as string | null

  if (fileName && filePath && fileType) {
    await supabase.from("documents").insert({
      org_id: profile.org_id,
      engineer_id: engineer.id,
      file_name: fileName,
      file_path: filePath,
      file_type: fileType,
      parsed_content: rawText,
    })
  }

  revalidatePath("/engineers")
  redirect("/engineers")
}

export async function updateEngineer(id: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const raw = JSON.parse(formData.get("data") as string)
  const parsed = engineerFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: "入力内容に不備があります" }
  }

  const engineerData = parsed.data
  const rawText = (formData.get("rawText") as string) ?? ""

  let embedding: number[] | null = null
  try {
    embedding = await generateEmbedding(engineerData)
  } catch {
    // Embedding 生成失敗
  }

  const { error } = await supabase
    .from("engineers")
    .update({
      name: engineerData.name,
      email: engineerData.email,
      skills: engineerData.skills,
      experience_years: engineerData.experience_years,
      industries: engineerData.industries,
      availability: engineerData.availability,
      soft_skills: engineerData.soft_skills,
      raw_text: rawText,
      embedding,
    })
    .eq("id", id)

  if (error) return { error: error.message }

  const fileName = formData.get("fileName") as string | null
  const filePath = formData.get("filePath") as string | null
  const fileType = formData.get("fileType") as string | null

  if (fileName && filePath && fileType) {
    await supabase.from("documents").delete().eq("engineer_id", id)

    const { data: profile } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single()

    if (profile) {
      await supabase.from("documents").insert({
        org_id: profile.org_id,
        engineer_id: id,
        file_name: fileName,
        file_path: filePath,
        file_type: fileType,
        parsed_content: rawText,
      })
    }
  }

  revalidatePath("/engineers")
  revalidatePath(`/engineers/${id}`)
  redirect(`/engineers/${id}`)
}

export async function deleteEngineer(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { data: docs } = await supabase.from("documents").select("file_path").eq("engineer_id", id)

  if (docs && docs.length > 0) {
    const paths = docs.map((d) => d.file_path)
    await supabase.storage.from("documents").remove(paths)
  }

  const { error } = await supabase.from("engineers").delete().eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/engineers")
  redirect("/engineers")
}

export async function uploadFile(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { data: profile } = await supabase.from("users").select("org_id").eq("id", user.id).single()
  if (!profile) return { error: "ユーザープロフィールが見つかりません" }

  const file = formData.get("file") as File
  if (!file) return { error: "ファイルが選択されていません" }

  const safeName = encodeURIComponent(file.name)
  const filePath = `${profile.org_id}/${crypto.randomUUID()}/${safeName}`
  const { error } = await supabase.storage.from("documents").upload(filePath, file)

  if (error) return { error: error.message }

  return { filePath }
}
