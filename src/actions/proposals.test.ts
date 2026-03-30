import { describe, expect, it } from "vitest"

describe("proposal actions", () => {
  it("モジュールがエクスポートされている", async () => {
    const mod = await import("./proposals")
    expect(mod.saveProposal).toBeDefined()
    expect(mod.updateProposal).toBeDefined()
    expect(mod.deleteProposal).toBeDefined()
    expect(typeof mod.saveProposal).toBe("function")
    expect(typeof mod.updateProposal).toBe("function")
    expect(typeof mod.deleteProposal).toBe("function")
  })
})
