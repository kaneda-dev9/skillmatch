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
  it("プレビューとエディタが表示される", () => {
    render(<ProposalEditor content="# テスト" matchId="m1" />)
    expect(screen.getAllByText("プレビュー").length).toBeGreaterThan(0)
    expect(screen.getAllByText("エディタ").length).toBeGreaterThan(0)
  })

  it("Markdown コンテンツがプレビューに表示される", () => {
    render(<ProposalEditor content="# テスト見出し" matchId="m1" />)
    expect(screen.getAllByText("テスト見出し").length).toBeGreaterThan(0)
  })

  it("コピーボタンが表示される", () => {
    render(<ProposalEditor content="test" matchId="m1" />)
    expect(screen.getAllByRole("button", { name: /コピー/ }).length).toBeGreaterThan(0)
  })

  it("保存ボタンが表示される", () => {
    render(<ProposalEditor content="test" matchId="m1" />)
    expect(screen.getAllByRole("button", { name: /保存/ }).length).toBeGreaterThan(0)
  })
})
