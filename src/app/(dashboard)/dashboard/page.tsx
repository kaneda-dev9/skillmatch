import { Briefcase, FileText, Target, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()

  const [engineers, projects, matches, proposals] = await Promise.all([
    supabase.from("engineers").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("matches").select("id", { count: "exact", head: true }),
    supabase.from("proposals").select("id", { count: "exact", head: true }),
  ])

  const stats = [
    { label: "エンジニア", value: engineers.count ?? 0, icon: Users, href: "/engineers" },
    { label: "案件", value: projects.count ?? 0, icon: Briefcase, href: "/projects" },
    { label: "マッチング", value: matches.count ?? 0, icon: Target, href: "/matching" },
    { label: "提案書", value: proposals.count ?? 0, icon: FileText, href: "/proposals" },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
