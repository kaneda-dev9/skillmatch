import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProjectForm } from "../../_components/project-form"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProjectPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single()

  if (!project) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{project.title} を編集</h1>
      <ProjectForm project={project} mode="edit" />
    </div>
  )
}
