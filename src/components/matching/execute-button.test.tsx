import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ExecuteMatchingButton } from "./execute-button"

vi.mock("@/actions/matching", () => ({
  executeMatching: vi.fn(),
}))

describe("ExecuteMatchingButton", () => {
  it("ボタンが表示される", () => {
    render(<ExecuteMatchingButton projectId="test-id" />)
    expect(screen.getByRole("button", { name: /マッチング実行/ })).toBeDefined()
  })
})
