import { describe, expect, it } from "vitest"
import { embeddingModel, llm, registry } from "./provider"

describe("AI SDK Provider Registry", () => {
  it("registry が定義されている", () => {
    expect(registry).toBeDefined()
  })

  it("llm が言語モデルとして取得できる", () => {
    expect(llm).toBeDefined()
    expect(llm.modelId).toBe("claude-sonnet-4-6")
  })

  it("embeddingModel が埋め込みモデルとして取得できる", () => {
    expect(embeddingModel).toBeDefined()
    expect(embeddingModel.modelId).toBe("text-embedding-3-small")
  })

  it("registry から任意のモデルを取得できる", () => {
    const model = registry.languageModel("anthropic:claude-sonnet-4-6")
    expect(model).toBeDefined()
  })
})
