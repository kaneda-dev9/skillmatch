import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/actions/auth", () => ({
  signup: vi.fn(),
}))

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

import SignupPage from "./page"

describe("SignupPage", () => {
  it("SkillMatch タイトルを表示する", () => {
    render(<SignupPage />)
    expect(screen.getByText("SkillMatch")).toBeInTheDocument()
  })

  it("名前・メールアドレス・パスワードの入力欄を表示する", () => {
    render(<SignupPage />)
    expect(screen.getByLabelText("名前")).toBeInTheDocument()
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument()
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument()
  })

  it("アカウント作成ボタンを表示する", () => {
    render(<SignupPage />)
    const buttons = screen.getAllByRole("button", { name: "アカウント作成" })
    expect(buttons.length).toBeGreaterThanOrEqual(1)
    expect(buttons[0]).toHaveAttribute("type", "submit")
  })

  it("ログインへのリンクを表示する", () => {
    render(<SignupPage />)
    const links = screen.getAllByRole("link", { name: "ログイン" })
    expect(links.length).toBeGreaterThanOrEqual(1)
    expect(links[0]).toHaveAttribute("href", "/login")
  })
})
