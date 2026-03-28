"use client"

import { Search, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ProjectSearchFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")
  const [status, setStatus] = useState(searchParams.get("status") ?? "all")

  function handleSearch() {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (status && status !== "all") params.set("status", status)
    router.push(`/projects?${params.toString()}`)
  }

  function handleClear() {
    setQuery("")
    setStatus("all")
    router.push("/projects")
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative max-w-md flex-1">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="タイトル・クライアント名で検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="pl-9"
        />
      </div>
      <Select value={status} onValueChange={(v) => v && setStatus(v)}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="ステータス" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="open">募集中</SelectItem>
          <SelectItem value="closed">終了</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={handleSearch} size="sm" aria-label="検索を実行">
        検索
      </Button>
      {(query || status !== "all") && (
        <Button onClick={handleClear} variant="ghost" size="sm" aria-label="検索条件をクリア">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
