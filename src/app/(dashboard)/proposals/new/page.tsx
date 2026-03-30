"use client"

import { useCompletion } from "@ai-sdk/react"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"
import Markdown from "react-markdown"
import { PdfDownloadButton } from "@/components/proposals/pdf-download-button"
import { ProposalEditor } from "@/components/proposals/proposal-editor"
import { Button } from "@/components/ui/button"

export default function NewProposalPage() {
  const searchParams = useSearchParams()
  const matchId = searchParams.get("matchId")

  const { completion, isLoading, complete, error } = useCompletion({
    api: "/api/proposals/generate",
  })

  useEffect(() => {
    if (matchId) {
      complete("", { body: { matchId } })
    }
  }, [matchId, complete])

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/matching" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">提案書生成</h1>
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              生成中...
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">提案書の生成に失敗しました。再試行してください。</p>
      )}

      {isLoading && completion && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">プレビュー</h3>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Markdown>{completion}</Markdown>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">エディタ</h3>
            <textarea
              value={completion}
              disabled
              className="h-96 w-full resize-y rounded-md border bg-muted p-3 font-mono text-sm"
            />
          </div>
        </div>
      )}

      {!isLoading && completion && (
        <>
          <ProposalEditor content={completion} matchId={matchId} />
          <div className="flex justify-end">
            <PdfDownloadButton content={completion} />
          </div>
        </>
      )}
    </div>
  )
}
