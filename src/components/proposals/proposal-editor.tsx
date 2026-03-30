"use client"

import { Check, Columns2, Copy, Download, RotateCcw, Save, SquareStack } from "lucide-react"
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
  const [generatingPdf, setGeneratingPdf] = useState(false)

  async function handleDownloadPdf() {
    setGeneratingPdf(true)
    try {
      const html = content
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^- (.+)$/gm, "<li>$1</li>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n\n/g, "<br><br>")
        .replace(/\n/g, "<br>")

      // iframe で CSS を隔離して html2canvas の lab() エラーを回避
      const iframe = document.createElement("iframe")
      iframe.style.position = "fixed"
      iframe.style.left = "-9999px"
      iframe.style.width = "794px" // A4 幅
      iframe.style.height = "1123px"
      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentDocument
      if (!iframeDoc) throw new Error("iframe document not available")

      iframeDoc.open()
      iframeDoc.write(`<!DOCTYPE html>
<html><head><style>
  body { font-family: sans-serif; font-size: 14px; line-height: 1.8; color: #1a1a1a; padding: 40px; margin: 0; }
  h1 { font-size: 24px; margin: 0 0 16px; }
  h2 { font-size: 18px; margin: 24px 0 12px; }
  h3 { font-size: 16px; margin: 16px 0 8px; }
  li { margin-left: 20px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; font-size: 13px; }
  th { background: #f5f5f5; font-weight: 600; }
</style></head><body>${html}</body></html>`)
      iframeDoc.close()

      const { default: html2pdf } = await import("html2pdf.js")
      await html2pdf()
        .set({
          margin: 10,
          filename: "proposal.pdf",
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(iframeDoc.body)
        .save()

      document.body.removeChild(iframe)
    } finally {
      setGeneratingPdf(false)
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
      <div className="prose prose-sm dark:prose-invert max-w-none">
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
        <Button onClick={handleDownloadPdf} variant="outline" size="sm" disabled={generatingPdf}>
          <Download className="mr-1.5 h-4 w-4" />
          {generatingPdf ? "生成中..." : "PDF ダウンロード"}
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
