import Link from "next/link"
import { ExecuteMatchingButton } from "@/components/matching/execute-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SkillBadge } from "@/components/ui/skill-badge"
import { createClient } from "@/lib/supabase/server"

export default async function MatchingPage() {
  const supabase = await createClient()

  // open ステータスの案件を取得
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })

  // マッチング済み案件の結果件数を取得
  const projectIds = (projects ?? []).map((p) => p.id)
  let matchCounts: Record<string, number> = {}

  if (projectIds.length > 0) {
    const { data: counts } = await supabase
      .from("matches")
      .select("project_id")
      .in("project_id", projectIds)

    if (counts) {
      matchCounts = counts.reduce(
        (acc, row) => {
          acc[row.project_id] = (acc[row.project_id] ?? 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">マッチング</h1>
      </div>

      {(!projects || projects.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>募集中の案件がありません</p>
          <Link href="/projects/new" className="mt-2 text-primary underline">
            案件を登録する
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(projects ?? []).map((project) => {
          const count = matchCounts[project.id] ?? 0

          return (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle className="text-lg">{project.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{project.client_name}</p>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex flex-wrap gap-1">
                  {project.required_skills.slice(0, 3).map((skill: { name: string }) => (
                    <SkillBadge key={skill.name} name={skill.name} />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <ExecuteMatchingButton projectId={project.id} size="sm" />
                  {count > 0 && (
                    <Link
                      href={`/matching/${project.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      結果を見る（{count}件）
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
