import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { deleteProject, toggleProjectStatus } from "@/actions/projects"
import { ExecuteMatchingButton } from "@/components/matching/execute-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { ProjectDetail } from "../_components/project-detail"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single()

  if (!project) notFound()

  async function handleDelete() {
    "use server"
    await deleteProject(id)
  }

  async function handleToggleStatus() {
    "use server"
    await toggleProjectStatus(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href="/projects" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <Badge variant={project.status === "open" ? "default" : "outline"}>
            {project.status === "open" ? "募集中" : "終了"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <ExecuteMatchingButton projectId={id} variant="outline" size="sm" />
          <form action={handleToggleStatus}>
            <Button variant="outline" type="submit">
              {project.status === "open" ? "終了にする" : "募集中にする"}
            </Button>
          </form>
          <Button variant="outline" render={<Link href={`/projects/${id}/edit`} />}>
            <Pencil className="mr-2 h-4 w-4" />
            編集
          </Button>
          <form action={handleDelete}>
            <Button variant="destructive" type="submit">
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </Button>
          </form>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link href={`/matching/${id}`} className="text-sm text-primary hover:underline">
          マッチング結果を見る
        </Link>
      </div>

      <ProjectDetail project={project} />
    </div>
  )
}
