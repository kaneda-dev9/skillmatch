import { Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { ProjectSearchFilter } from "./_components/project-search-filter"
import { ProjectTable } from "./_components/project-table"

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase.from("projects").select("*").order("created_at", { ascending: false })

  if (params.q) {
    query = query.or(`title.ilike.%${params.q}%,client_name.ilike.%${params.q}%`)
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status)
  }

  const { data: projects } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">案件</h1>
        <Button render={<Link href="/projects/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          案件登録
        </Button>
      </div>
      <ProjectSearchFilter />
      <ProjectTable projects={projects ?? []} />
    </div>
  )
}
