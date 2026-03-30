"use client"

import { Check, Columns2, Copy, RotateCcw, Save, SquareStack } from "lucide-react"
import { useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { saveProposal, updateProposal } from "@/actions/proposals"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ProposalEditorProps {
  content: string
  matchId: string
  proposalId?: string
  readOnly?: boolean
}

export function ProposalEditor({
  content: initialContent,
  matchId,
  proposalId,
  readOnly = false,
}: ProposalEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [layout, setLayout] = useState<"split" | "tabs">("split")
  const [activeTab, setActiveTab] = useState<"preview" | "editor">("preview")

  async function handleSave() {
    setSaving(true)
    setError(null)

    const result = proposalId
      ? await updateProposal(proposalId, content)
      : await saveProposal(matchId, content)

    setSaving(false)

    if ("error" in result && result.error) {
      setError(result.error)
      return
    }

    if (!proposalId && "id" in result) {
      window.location.href = `/proposals/${result.id}`
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const previewPanel = (
    <div className="rounded-lg border p-4">
      {layout === "split" && (
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">プレビュー</h3>
      )}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      </div>
    </div>
  )

  const editorPanel = (
    <div className="flex flex-col rounded-lg border p-4">
      {layout === "split" && (
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">エディタ</h3>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={readOnly}
        className="min-h-96 w-full flex-1 resize-y rounded-md border bg-background p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <div className="sticky bottom-0 mt-3 flex gap-2 border-t bg-background pt-3">
        <Button onClick={handleSave} disabled={saving || readOnly} size="sm">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "保存中..." : proposalId ? "更新" : "保存"}
        </Button>
        <Button onClick={handleCopy} variant="outline" size="sm">
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              コピー済み
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              コピー
            </>
          )}
        </Button>
        {content !== initialContent && (
          <Button
            onClick={() => setContent(initialContent)}
            variant="ghost"
            size="sm"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            元に戻す
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div>
      {/* レイアウト切り替えボタン */}
      <div className="mb-4 flex items-center justify-end gap-1">
        <Button
          variant={layout === "split" ? "default" : "outline"}
          size="sm"
          onClick={() => setLayout("split")}
        >
          <Columns2 className="mr-1.5 h-4 w-4" />
          2カラム
        </Button>
        <Button
          variant={layout === "tabs" ? "default" : "outline"}
          size="sm"
          onClick={() => setLayout("tabs")}
        >
          <SquareStack className="mr-1.5 h-4 w-4" />
          タブ
        </Button>
      </div>

      {/* 2カラム */}
      {layout === "split" && (
        <div className="grid grid-cols-2 gap-4">
          {previewPanel}
          {editorPanel}
        </div>
      )}

      {/* タブ切り替え */}
      {layout === "tabs" && (
        <div>
          <div className="mb-4 flex border-b">
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={cn(
                "px-4 py-2 text-sm font-medium",
                activeTab === "preview"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              プレビュー
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={cn(
                "px-4 py-2 text-sm font-medium",
                activeTab === "editor"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              エディタ
            </button>
          </div>
          {activeTab === "preview" ? previewPanel : editorPanel}
        </div>
      )}
    </div>
  )
}
