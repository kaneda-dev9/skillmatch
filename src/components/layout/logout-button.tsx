"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()

    // Supabase のセッションクッキーを明示的に削除
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0]
      if (name.startsWith("sb-")) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      }
    })

    router.push("/login")
    router.refresh()
  }

  return (
    <DropdownMenuItem onClick={handleLogout}>
      <LogOut className="mr-2 h-4 w-4" />
      ログアウト
    </DropdownMenuItem>
  )
}
