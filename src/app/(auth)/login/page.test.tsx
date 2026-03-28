import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/actions/auth", () => ({
  login: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  it("SkillMatch タイトルを表示する", () => {
    render(<LoginPage />);
    expect(screen.getByText("SkillMatch")).toBeInTheDocument();
  });

  it("メールアドレスとパスワードの入力欄を表示する", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
  });

  it("ログインボタンを表示する", () => {
    render(<LoginPage />);
    const buttons = screen.getAllByRole("button", { name: "ログイン" });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    expect(buttons[0]).toHaveAttribute("type", "submit");
  });

  it("サインアップへのリンクを表示する", () => {
    render(<LoginPage />);
    const links = screen.getAllByRole("link", { name: "サインアップ" });
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0]).toHaveAttribute("href", "/signup");
  });
});
