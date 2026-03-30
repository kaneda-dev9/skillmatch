"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  })

  if (error) {
    return { error: error.message }
  }

  redirect("/dashboard")
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const orgName = formData.get("orgName") as string
  if (!orgName?.trim()) {
    return { error: "組織名を入力してください" }
  }

  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: {
        name: formData.get("name") as string,
        org_name: orgName.trim(),
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect("/dashboard")
}
