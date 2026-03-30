"use client"

import { useCompletion } from "@ai-sdk/react"
import { ArrowLeft, Loader2, Zap } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { saveProposal } from "@/actions/proposals"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export default function NewProposalPage() {
  return (
    <Suspense
      fallback={<div className="py-12 text-center text-muted-foreground">読み込み中...</div>}
    >
      <NewProposalContent />
    </Suspense>
  )
}

function NewProposalContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const matchId = searchParams.get("matchId")
  const [checking, setChecking] = useState(true)
  const [saving, setSaving] = useState(false)

  const { completion, isLoading, complete, error } = useCompletion({
    api: "/api/proposals/generate",
    streamProtocol: "text",
    onFinish: async (_prompt, finalCompletion) => {
      if (!matchId || !finalCompletion) return
      setSaving(true)
      const result = await saveProposal(matchId, finalCompletion)
      if ("id" in result) {
        router.replace(`/proposals/${result.id}`)
      } else {
        setSaving(false)
      }
    },
  })

  // 既に保存済みの提案書があればリダイレクト
  useEffect(() => {
    if (!matchId) {
      setChecking(false)
      return
    }

    const supabase = createClient()
    supabase
      .from("proposals")
      .select("id")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          router.replace(`/proposals/${data[0].id}`)
        } else {
          setChecking(false)
        }
      })
  }, [matchId, router])

  function handleGenerate() {
    if (!matchId) return
    complete("", { body: { matchId } })
  }

  if (!matchId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>matchId が指定されていません</p>
        <Link href="/matching" className="mt-2 text-primary underline">
          マッチング画面に戻る
        </Link>
      </div>
    )
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        確認中...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/matching" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">提案書生成</h1>
          {(isLoading || saving) && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {saving ? "保存中..." : "生成中..."}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">提案書の生成に失敗しました。再試行してください。</p>
      )}

      {/* 未開始: 生成ボタン */}
      {!isLoading && !completion && !saving && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="mb-4">提案書を AI で自動生成します</p>
          <Button onClick={handleGenerate}>
            <Zap className="mr-2 h-4 w-4" />
            生成開始
          </Button>
        </div>
      )}

      {/* 生成中 / 保存中: ストリーミングプレビュー */}
      {(isLoading || saving) && completion && (
        <div className="rounded-lg border p-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown remarkPlugins={[remarkGfm]}>{completion}</Markdown>
          </div>
        </div>
      )}
    </div>
  )
}
