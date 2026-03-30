"use client"

import { Check, Columns2, Copy, Download, RotateCcw, Save, SquareStack } from "lucide-react"
import { useRef, useState } from "react"
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
  const previewRef = useRef<HTMLDivElement>(null)

  function handleDownloadPdf() {
    const previewEl = previewRef.current
    if (!previewEl) return

    const printContent = previewEl.innerHTML
    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join("\n")
        } catch {
          return ""
        }
      })
      .join("\n")

    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.left = "-9999px"
    iframe.style.width = "0"
    iframe.style.height = "0"
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    if (!doc) return

    doc.open()
    doc.write(`<!DOCTYPE html>
<html><head>
<style>${styles}</style>
<style>
  @media print {
    body { padding: 20px; background: white; color: black; }
    a { color: black; text-decoration: none; }
  }
</style>
</head><body>
<div class="prose prose-sm max-w-none" style="color: black;">${printContent}</div>
</body></html>`)
    doc.close()

    iframe.onload = () => {
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }
  }

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

  const isModified = content !== initialContent

  const actionButtons = (
    <div className="flex items-center gap-1">
      <Button onClick={handleSave} disabled={saving || readOnly} size="sm">
        <Save className="mr-1.5 h-3.5 w-3.5" />
        {saving ? "保存中..." : proposalId ? "更新" : "保存"}
      </Button>
      <Button onClick={handleCopy} variant="outline" size="sm">
        {copied ? (
          <>
            <Check className="mr-1.5 h-3.5 w-3.5" />
            コピー済み
          </>
        ) : (
          <>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            コピー
          </>
        )}
      </Button>
      {isModified && (
        <Button onClick={() => setContent(initialContent)} variant="ghost" size="sm">
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          元に戻す
        </Button>
      )}
    </div>
  )

  const previewPanel = (
    <div className="rounded-lg border p-4">
      {layout === "split" && (
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">プレビュー</h3>
      )}
      <div ref={previewRef} className="prose prose-sm dark:prose-invert max-w-none">
        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      </div>
    </div>
  )

  const editorPanel = (
    <div className="flex flex-col rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        {layout === "split" && (
          <h3 className="text-sm font-semibold text-muted-foreground">エディタ</h3>
        )}
        <div className={layout === "tabs" ? "ml-auto" : ""}>{actionButtons}</div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={readOnly}
        className="min-h-96 w-full flex-1 resize-y rounded-md border bg-background p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  )

  return (
    <div>
      {/* ツールバー: PDF + レイアウト切り替え */}
      <div className="mb-4 flex items-center justify-end gap-3">
        <Button onClick={handleDownloadPdf} variant="outline" size="sm">
          <Download className="mr-1.5 h-4 w-4" />
          PDF ダウンロード
        </Button>
        <div className="flex rounded-lg border p-0.5">
          <button
            type="button"
            onClick={() => setLayout("split")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              layout === "split"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Columns2 className="h-3.5 w-3.5" />
            2カラム
          </button>
          <button
            type="button"
            onClick={() => setLayout("tabs")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              layout === "tabs"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <SquareStack className="h-3.5 w-3.5" />
            タブ
          </button>
        </div>
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

