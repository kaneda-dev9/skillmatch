import { describe, expect, it } from "vitest"

describe("matching actions", () => {
  it("モジュールがエクスポートされている", async () => {
    const mod = await import("./matching")
    expect(mod.executeMatching).toBeDefined()
    expect(mod.getMatchResults).toBeDefined()
    expect(typeof mod.executeMatching).toBe("function")
    expect(typeof mod.getMatchResults).toBe("function")
  })
})
