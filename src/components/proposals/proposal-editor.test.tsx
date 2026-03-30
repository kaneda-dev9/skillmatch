import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ProposalEditor } from "./proposal-editor"

vi.mock("@/actions/proposals", () => ({
  saveProposal: vi.fn(),
  updateProposal: vi.fn(),
}))

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => {
    const text = children.replace(/^#+\s+/gm, "")
    return <div>{text}</div>
  },
}))

describe("ProposalEditor", () => {
  it("プレビューとエディタの2カラムが表示される", () => {
    render(<ProposalEditor content="# テスト" matchId="m1" />)
    expect(screen.getByText("プレビュー")).toBeDefined()
    expect(screen.getByText("エディタ")).toBeDefined()
  })

  it("Markdown コンテンツがプレビューに表示される", () => {
    render(<ProposalEditor content="# テスト見出し" matchId="m1" />)
    expect(screen.getByText("テスト見出し")).toBeDefined()
  })

  it("コピーボタンが表示される", () => {
    render(<ProposalEditor content="test" matchId="m1" />)
    expect(screen.getByRole("button", { name: /コピー/ })).toBeDefined()
  })

  it("保存ボタンが表示される", () => {
    render(<ProposalEditor content="test" matchId="m1" />)
    expect(screen.getByRole("button", { name: /保存/ })).toBeDefined()
  })
})
