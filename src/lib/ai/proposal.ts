import type { Availability, Skill, SoftSkill } from "@/types"

interface ProjectForProposal {
  title: string
  client_name: string
  required_skills: Skill[]
  experience_years: number
  industries: string[]
  conditions: Availability
  description: string
}

interface EngineerForProposal {
  name: string
  skills: Skill[]
  experience_years: number
  industries: string[]
  availability: Availability
  soft_skills: SoftSkill[]
}

interface MatchForProposal {
  overall_score: number
  skill_score: number
  experience_score: number
  industry_score: number
  condition_score: number
  soft_skill_score: number
  ai_reasoning: string
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

export function buildProposalPrompt(
  project: ProjectForProposal,
  engineer: EngineerForProposal,
  match: MatchForProposal,
): string {
  return `あなたはSES営業の提案書作成の専門家です。以下の案件・エンジニア・マッチング評価の情報をもとに、クライアント企業への提案書を作成してください。

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
- ソフトスキル: ${engineer.soft_skills.map((s) => `${s.name}${s.description ? `（${s.description}）` : ""}`).join(", ") || "なし"}

## マッチング評価
- 総合スコア: ${match.overall_score}/100
- 技術スキル: ${match.skill_score} | 経験年数: ${match.experience_score} | 業界: ${match.industry_score} | 条件: ${match.condition_score} | ソフトスキル: ${match.soft_skill_score}
- AI評価: ${match.ai_reasoning}

## 出力フォーマット（必ずこの構成で作成）

以下のMarkdown形式で提案書を作成してください:

# 候補者ご提案書

## 候補者概要
氏名、経験年数、主要スキルの要約を2〜3文で。

## スキルマッチ度
総合スコアと項目別スコアを表形式で示し、各項目の簡潔な説明を付けてください。

## 推薦理由
案件要件とエンジニアのスキル・経験の具体的な合致点を述べ、なぜこの候補者が最適かを3〜5段落で説明してください。具体的な技術名や経験を挙げて根拠を示してください。

## 稼働条件
単価、稼働開始日、リモート可否、勤務地を記載し、案件条件との適合状況を述べてください。`
}
