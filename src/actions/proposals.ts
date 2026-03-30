"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function saveProposal(matchId: string, content: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { data: profile } = await supabase.from("users").select("org_id").eq("id", user.id).single()
  if (!profile) return { error: "ユーザープロフィールが見つかりません" }

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      org_id: profile.org_id,
      match_id: matchId,
      content,
      format: "markdown",
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  revalidatePath("/proposals")
  return { id: data.id }
}

export async function updateProposal(id: string, content: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { error } = await supabase
    .from("proposals")
    .update({ content })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/proposals")
  revalidatePath(`/proposals/${id}`)
  return { success: true }
}

export async function deleteProposal(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "認証が必要です" }

  const { error } = await supabase.from("proposals").delete().eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/proposals")
  redirect("/proposals")
}
