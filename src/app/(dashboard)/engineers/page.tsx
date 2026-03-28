import { Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { EngineerTable } from "./_components/engineer-table"
import { SearchFilter } from "./_components/search-filter"

interface PageProps {
  searchParams: Promise<{ q?: string; remote?: string; sort?: string }>
}

export default async function EngineersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase.from("engineers").select("*").order("created_at", { ascending: false })

  if (params.q) {
    query = query.or(`name.ilike.%${params.q}%,skills->0->>name.ilike.%${params.q}%`)
  }

  if (params.remote === "true") {
    query = query.eq("availability->>remote", "true")
  }

  const { data: engineers } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">エンジニア</h1>
        <Button render={<Link href="/engineers/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          エンジニア登録
        </Button>
      </div>
      <SearchFilter />
      <EngineerTable engineers={engineers ?? []} />
    </div>
  )
}
