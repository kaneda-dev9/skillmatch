"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Project } from "@/types"

interface ProjectTableProps {
  projects: Project[]
}

export function ProjectTable({ projects }: ProjectTableProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>案件が登録されていません</p>
        <Link href="/projects/new" className="mt-2 text-primary underline">
          案件を登録する
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>タイトル</TableHead>
            <TableHead>クライアント</TableHead>
            <TableHead>要求スキル</TableHead>
            <TableHead>経験年数</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>登録日</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id} className="hover:bg-muted/50">
              <TableCell>
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {project.title}
                </Link>
              </TableCell>
              <TableCell>{project.client_name}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {project.required_skills.slice(0, 3).map((skill) => (
                    <Badge key={skill.name} variant="secondary">
                      {skill.name}
                    </Badge>
                  ))}
                  {project.required_skills.length > 3 && (
                    <Badge variant="outline">+{project.required_skills.length - 3}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{project.experience_years}年</TableCell>
              <TableCell>
                <Badge variant={project.status === "open" ? "default" : "outline"}>
                  {project.status === "open" ? "募集中" : "終了"}
                </Badge>
              </TableCell>
              <TableCell>{new Date(project.created_at).toLocaleDateString("ja-JP")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
