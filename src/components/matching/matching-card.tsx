"use client"

import { FileText } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Engineer, Skill } from "@/types"

interface MatchingCardProps {
  match: {
    id: string
    overall_score: number
    skill_score: number
    experience_score: number
    industry_score: number
    condition_score: number
    soft_skill_score: number
    ai_reasoning: string
    engineer: Pick<Engineer, "id" | "name" | "skills" | "experience_years">
  }
  proposalId?: string
}

function scoreColor(score: number): string {
  if (score >= 80) return "bg-green-500 text-white"
  if (score >= 60) return "bg-yellow-500 text-black"
  return "bg-red-500 text-white"
}

function formatTopSkills(skills: Skill[]): string {
  return skills
    .slice(0, 3)
    .map((s) => s.name)
    .join(" / ")
}

export function MatchingCard({ match, proposalId }: MatchingCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { engineer } = match

  const scoreBadges = [
    `技術 ${match.skill_score}`,
    `経験 ${match.experience_score}`,
    `業界 ${match.industry_score}`,
    `条件 ${match.condition_score}`,
    `ソフト ${match.soft_skill_score}`,
  ]

  return (
    <div className="overflow-hidden rounded-xl bg-card p-4 text-sm text-card-foreground ring-1 ring-foreground/10">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/engineers/${engineer.id}`}
            className="text-lg font-semibold hover:underline"
          >
            {engineer.name}
          </Link>
          <p className="text-sm text-muted-foreground">
            {formatTopSkills(engineer.skills)} — {engineer.experience_years}年
          </p>
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold",
            scoreColor(match.overall_score),
          )}
        >
          {match.overall_score}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {scoreBadges.map((label) => (
          <span
            key={label}
            className="inline-flex h-5 items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="mt-3 border-t pt-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {expanded ? "▼" : "▶"} AI評価
          </button>
          {proposalId ? (
            <Link
              href={`/proposals/${proposalId}`}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <FileText className="h-3 w-3" />
              提案書を確認
            </Link>
          ) : (
            <Link
              href={`/proposals/new?matchId=${match.id}`}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <FileText className="h-3 w-3" />
              提案書を生成
            </Link>
          )}
        </div>
        {expanded && <p className="mt-2 text-sm text-muted-foreground">{match.ai_reasoning}</p>}
      </div>
    </div>
  )
}
