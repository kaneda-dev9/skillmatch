"use client"

import { Search, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SearchFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")
  const [remoteOnly, setRemoteOnly] = useState(searchParams.get("remote") === "true")

  function handleSearch() {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (remoteOnly) params.set("remote", "true")
    router.push(`/engineers?${params.toString()}`)
  }

  function handleClear() {
    setQuery("")
    setRemoteOnly(false)
    router.push("/engineers")
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative max-w-md flex-1">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="名前・スキルで検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="pl-9"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={remoteOnly}
          onChange={(e) => setRemoteOnly(e.target.checked)}
          className="rounded"
        />
        リモート可のみ
      </label>
      <Button onClick={handleSearch} size="sm">
        検索
      </Button>
      {(query || remoteOnly) && (
        <Button onClick={handleClear} variant="ghost" size="sm">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
