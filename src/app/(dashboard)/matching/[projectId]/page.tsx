import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getMatchResults } from "@/actions/matching"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExecuteMatchingButton } from "@/components/matching/execute-button"
import { MatchingCard } from "@/components/matching/matching-card"
import { createClient } from "@/lib/supabase/server"

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default async function MatchingResultPage({ params }: PageProps) {
  const { projectId } = await params
  const supabase = await createClient()

  // 案件情報を取得
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single()

  if (!project) notFound()

  // マッチング結果を取得
  const { data: matches, error } = await getMatchResults(projectId)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href="/matching" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">マッチング結果</h1>
            <p className="text-sm text-muted-foreground">
              {project.title} — {project.client_name}
            </p>
          </div>
        </div>
        <ExecuteMatchingButton projectId={projectId} variant="outline" />
      </div>

      {/* 案件サマリー */}
      <div className="flex flex-wrap gap-2">
        {project.required_skills.map((skill: { name: string }) => (
          <Badge key={skill.name} variant="secondary">
            {skill.name}
          </Badge>
        ))}
        <Badge variant="outline">{project.experience_years}年以上</Badge>
        {project.industries.map((ind: string) => (
          <Badge key={ind} variant="outline">
            {ind}
          </Badge>
        ))}
      </div>

      {/* エラー表示 */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* 結果なし */}
      {(!matches || matches.length === 0) && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>マッチング結果がありません</p>
          <p className="text-sm">「マッチング実行」ボタンを押して評価を開始してください</p>
        </div>
      )}

      {/* カードリスト */}
      <div className="space-y-4">
        {(matches ?? []).map((match) => (
          <MatchingCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  )
}
