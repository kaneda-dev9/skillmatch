"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SkillBadge } from "@/components/ui/skill-badge"
import type { Project } from "@/types"

interface ProjectDetailProps {
  project: Project
}

export function ProjectDetail({ project }: ProjectDetailProps) {
  return (
    <div className="space-y-4">
      {/* 要求スキル */}
      <Card>
        <CardHeader>
          <CardTitle>要求スキル</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {project.required_skills.map((skill) => (
              <SkillBadge key={skill.name} name={skill.name} />
            ))}
            {project.required_skills.length === 0 && (
              <p className="text-sm text-muted-foreground">未登録</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">クライアント</dt>
              <dd className="font-medium">{project.client_name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">必要経験年数</dt>
              <dd className="font-medium">{project.experience_years}年</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">業界</dt>
              <dd className="font-medium">{project.industries.join(", ") || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">リモート</dt>
              <dd className="font-medium">{project.conditions?.remote ? "可" : "不可"}</dd>
            </div>
            {(project.conditions?.rate_min || project.conditions?.rate_max) && (
              <div>
                <dt className="text-muted-foreground">単価</dt>
                <dd className="font-medium">
                  {project.conditions.rate_min?.toLocaleString()}〜
                  {project.conditions.rate_max?.toLocaleString()}円
                </dd>
              </div>
            )}
            {project.conditions?.location && (
              <div>
                <dt className="text-muted-foreground">勤務地</dt>
                <dd className="font-medium">{project.conditions.location}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* 案件説明 */}
      {project.description && (
        <Card>
          <CardHeader>
            <CardTitle>案件説明</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{project.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
