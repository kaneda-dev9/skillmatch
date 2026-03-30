import { ArrowLeft, Trash2 } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { deleteProposal } from "@/actions/proposals"
import { ProposalEditor } from "@/components/proposals/proposal-editor"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProposalDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*, match:matches(*, engineer:engineers(name), project:projects(title, client_name))")
    .eq("id", id)
    .single()

  if (!proposal) notFound()

  const projectTitle = proposal.match?.project?.title ?? "不明"
  const engineerName = proposal.match?.engineer?.name ?? "不明"

  async function handleDelete() {
    "use server"
    await deleteProposal(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href="/proposals" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">提案書</h1>
            <p className="text-sm text-muted-foreground">
              {projectTitle} × {engineerName}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <form action={handleDelete}>
            <Button variant="destructive" size="sm" type="submit">
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </Button>
          </form>
        </div>
      </div>

      <ProposalEditor content={proposal.content} proposalId={id} />
    </div>
  )
}
