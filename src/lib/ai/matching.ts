import { generateText, Output } from "ai"
import type { MatchEvaluation } from "@/lib/validations/shared"
import { matchEvaluationSchema } from "@/lib/validations/shared"
import type { Availability, Skill, SoftSkill } from "@/types"
import { llm } from "./provider"

interface ProjectForMatching {
  title: string
  client_name: string
  required_skills: Skill[]
  experience_years: number
  industries: string[]
  conditions: Availability
  description: string
}

interface EngineerForMatching {
  name: string
  skills: Skill[]
  experience_years: number
  industries: string[]
  availability: Availability
  soft_skills: SoftSkill[]
}

function formatSkills(skills: Skill[]): string {
  return skills.map((s) => `${s.name}（${s.level}・${s.years}年）`).join(", ")
}

function formatAvailability(a: Availability): string {
  const parts: string[] = []
  if (a.rate_min || a.rate_max) parts.push(`単価: ${a.rate_min ?? "?"}〜${a.rate_max ?? "?"}円`)
  if (a.start_date) parts.push(`稼働開始: ${a.start_date}`)
  parts.push(`リモート: ${a.remote ? "可" : "不可"}`)
  if (a.location) parts.push(`勤務地: ${a.location}`)
  return parts.join(", ")
}

export function buildMatchingPrompt(
  project: ProjectForMatching,
  engineer: EngineerForMatching,
): string {
  return `あなたはエンジニアマッチングの専門家です。以下の案件とエンジニアを比較し、マッチング評価を行ってください。

## 案件情報
- タイトル: ${project.title}
- クライアント: ${project.client_name}
- 要求スキル: ${formatSkills(project.required_skills)}
- 必要経験年数: ${project.experience_years}年
- 業界: ${project.industries.join(", ") || "指定なし"}
- 稼働条件: ${formatAvailability(project.conditions)}
- 説明: ${project.description || "なし"}

## エンジニア情報
- 名前: ${engineer.name}
- スキル: ${formatSkills(engineer.skills)}
- 経験年数: ${engineer.experience_years}年
- 業界経験: ${engineer.industries.join(", ") || "なし"}
- 稼働条件: ${formatAvailability(engineer.availability)}
- ソフトスキル: ${engineer.soft_skills.map((s) => s.name).join(", ") || "なし"}

## 評価基準
以下の5軸で 0〜100 のスコアを付けてください:

1. **技術スキル (skill_score)**: 要求スキルとの一致度。スキル名・レベル・経験年数を考慮
2. **経験年数 (experience_score)**: 必要経験年数との比較。関連技術での経験を重視
3. **業界・ドメイン (industry_score)**: 案件の業界と過去の業界経験の一致度
4. **稼働条件 (condition_score)**: 単価レンジ、リモート可否、勤務地、稼働時期の適合度
5. **ソフトスキル (soft_skill_score)**: リーダーシップ、コミュニケーション等の適合度

**総合スコア (overall_score)** は単純平均ではなく、案件の要件に応じて重要な項目に重み付けして総合的に判断してください。

**評価理由 (ai_reasoning)** は日本語で3〜5文程度。具体的な根拠（どのスキルが一致、どの経験が活かせるか等）を含めてください。`
}

export async function evaluateEngineer(
  project: ProjectForMatching,
  engineer: EngineerForMatching,
): Promise<MatchEvaluation> {
  const prompt = buildMatchingPrompt(project, engineer)

  const result = await generateText({
    model: llm,
    output: Output.object({ schema: matchEvaluationSchema }),
    messages: [{ role: "user", content: prompt }],
  })

  return result.output
}
