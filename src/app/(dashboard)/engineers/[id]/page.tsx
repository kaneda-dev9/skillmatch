import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { deleteEngineer } from "@/actions/engineers"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { EngineerDetail } from "../_components/engineer-detail"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EngineerDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: engineer } = await supabase.from("engineers").select("*").eq("id", id).single()

  if (!engineer) notFound()

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("engineer_id", id)
    .order("created_at", { ascending: false })
    .limit(1)

  const document = documents?.[0] ?? null
  const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  async function handleDelete() {
    "use server"
    await deleteEngineer(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href="/engineers" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{engineer.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href={`/engineers/${id}/edit`} />}>
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

      <EngineerDetail engineer={engineer} document={document} storageUrl={storageUrl} />
    </div>
  )
}
