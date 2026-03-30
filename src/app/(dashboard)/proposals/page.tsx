import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"

export default async function ProposalsPage() {
  const supabase = await createClient()

  const { data: proposals } = await supabase
    .from("proposals")
    .select("*, match:matches(*, engineer:engineers(name), project:projects(title, client_name))")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">提案書</h1>

      {(!proposals || proposals.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>提案書がありません</p>
          <Link href="/matching" className="mt-2 text-primary underline">
            マッチング画面で提案書を生成する
          </Link>
        </div>
      )}

      {proposals && proposals.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>案件名</TableHead>
                <TableHead>エンジニア</TableHead>
                <TableHead>生成日時</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((proposal) => (
                <TableRow key={proposal.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Link
                      href={`/proposals/${proposal.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {proposal.match?.project?.title ?? "不明"}
                    </Link>
                  </TableCell>
                  <TableCell>{proposal.match?.engineer?.name ?? "不明"}</TableCell>
                  <TableCell>
                    {new Date(proposal.created_at).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
