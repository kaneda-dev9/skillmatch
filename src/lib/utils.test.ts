import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("単一のクラス名を返す", () => {
    expect(cn("foo")).toBe("foo")
  })

  it("複数のクラス名を結合する", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("条件付きクラス名を処理する", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz")
  })

  it("Tailwind の競合を解決する", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })

  it("undefined / null を無視する", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar")
  })
})
