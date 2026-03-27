import { createProviderRegistry } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

export const registry = createProviderRegistry({
  anthropic: createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
  openai: createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }),
});

// 言語モデル（構造化・評価・生成）
export const llm = registry.languageModel("anthropic:claude-sonnet-4-6");

// 埋め込みモデル
export const embeddingModel = registry.embeddingModel(
  "openai:text-embedding-3-small",
);
