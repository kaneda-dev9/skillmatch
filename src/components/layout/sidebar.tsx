"use client"

import { Briefcase, FileText, LayoutDashboard, Settings, Target, Users, Zap } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/engineers", label: "エンジニア", icon: Users },
  { href: "/projects", label: "案件", icon: Briefcase },
  { href: "/matching", label: "マッチング", icon: Target },
  { href: "/proposals", label: "提案書", icon: FileText },
]

const bottomItems = [{ href: "/settings", label: "設定", icon: Settings }]

interface SidebarNavProps {
  onNavigate?: () => void
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <>
      <div className="flex h-14 items-center border-b px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-bold text-primary"
          onClick={onNavigate}
        >
          <Zap className="h-5 w-5 fill-primary" />
          SkillMatch
        </Link>
      </div>
      <nav aria-label="メインナビゲーション" className="flex flex-1 flex-col justify-between">
        <ul className="space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
        <ul className="space-y-1 border-t px-3 py-4">
          {bottomItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden h-full w-64 flex-col border-r bg-muted/30 lg:flex">
      <SidebarNav />
    </aside>
  )
}
