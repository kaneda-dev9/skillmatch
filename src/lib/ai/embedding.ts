import { embed } from "ai";
import type { EngineerFormData } from "@/lib/validations/engineer";
import { embeddingModel } from "./provider";

type EmbeddingInput = Pick<
  EngineerFormData,
  "name" | "skills" | "experience_years" | "industries" | "availability" | "soft_skills"
>;

export function buildEmbeddingText(engineer: EmbeddingInput): string {
  const parts: string[] = [];

  parts.push(`名前: ${engineer.name}`);
  parts.push(`経験年数: ${engineer.experience_years}年`);

  if (engineer.skills.length > 0) {
    const skillTexts = engineer.skills.map((s) => `${s.name}(${s.level}, ${s.years}年)`);
    parts.push(`スキル: ${skillTexts.join(", ")}`);
  }

  if (engineer.industries.length > 0) {
    parts.push(`業界: ${engineer.industries.join(", ")}`);
  }

  if (engineer.availability) {
    const avail = engineer.availability;
    const conditions: string[] = [];
    if (avail.rate_min || avail.rate_max) {
      conditions.push(`単価: ${avail.rate_min ?? "?"}〜${avail.rate_max ?? "?"}`);
    }
    if (avail.remote) conditions.push("リモート可");
    if (avail.location) conditions.push(`勤務地: ${avail.location}`);
    if (avail.start_date) conditions.push(`稼働開始: ${avail.start_date}`);
    if (conditions.length > 0) {
      parts.push(`稼働条件: ${conditions.join(", ")}`);
    }
  }

  if (engineer.soft_skills.length > 0) {
    parts.push(`ソフトスキル: ${engineer.soft_skills.map((s) => s.name).join(", ")}`);
  }

  return parts.join("\n");
}

export async function generateEmbedding(engineer: EmbeddingInput): Promise<number[]> {
  const text = buildEmbeddingText(engineer);
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  return embedding;
}
