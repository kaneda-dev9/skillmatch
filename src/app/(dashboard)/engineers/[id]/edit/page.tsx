import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EngineerForm } from "../../_components/engineer-form"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditEngineerPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: engineer } = await supabase.from("engineers").select("*").eq("id", id).single()

  if (!engineer) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{engineer.name} を編集</h1>
      <EngineerForm engineer={engineer} mode="edit" />
    </div>
  )
}
