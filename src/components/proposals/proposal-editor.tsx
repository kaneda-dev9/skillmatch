"use client"

import { Check, Copy, Save } from "lucide-react"
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
      <h3 className="mb-3 hidden text-sm font-semibold text-muted-foreground lg:block">
        プレビュー
      </h3>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      </div>
    </div>
  )

  const editorPanel = (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 hidden text-sm font-semibold text-muted-foreground lg:block">エディタ</h3>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={readOnly}
        className="h-96 w-full resize-y rounded-md border bg-background p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <div className="mt-3 flex gap-2">
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
      </div>
    </div>
  )

  return (
    <>
      {/* デスクトップ: 2カラム */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        {previewPanel}
        {editorPanel}
      </div>

      {/* モバイル/タブレット: タブ切り替え */}
      <div className="lg:hidden">
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
    </>
  )
}
