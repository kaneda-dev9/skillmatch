import { describe, expect, it } from "vitest"
import { extractTextFromDocx, extractTextFromXlsx } from "./parse-document"

describe("extractTextFromDocx", () => {
  it("関数が定義されている", () => {
    expect(extractTextFromDocx).toBeDefined()
    expect(typeof extractTextFromDocx).toBe("function")
  })
})

describe("extractTextFromXlsx", () => {
  it("関数が定義されている", () => {
    expect(extractTextFromXlsx).toBeDefined()
    expect(typeof extractTextFromXlsx).toBe("function")
  })
})
