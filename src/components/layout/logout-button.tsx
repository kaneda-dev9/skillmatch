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
