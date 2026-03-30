import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ProposalEditor } from "./proposal-editor"

vi.mock("@/actions/proposals", () => ({
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
    render(<ProposalEditor content="# テスト" />)
    expect(screen.getAllByText("プレビュー").length).toBeGreaterThan(0)
    expect(screen.getAllByText("エディタ").length).toBeGreaterThan(0)
  })

  it("Markdown コンテンツがプレビューに表示される", () => {
    render(<ProposalEditor content="# テスト見出し" />)
    expect(screen.getAllByText("テスト見出し").length).toBeGreaterThan(0)
  })

  it("コピーボタンが表示される", () => {
    render(<ProposalEditor content="test" />)
    expect(screen.getAllByRole("button", { name: /コピー/ }).length).toBeGreaterThan(0)
  })

  it("更新ボタンが表示される", () => {
    render(<ProposalEditor content="test" proposalId="p1" />)
    expect(screen.getAllByRole("button", { name: /更新/ }).length).toBeGreaterThan(0)
  })
})
