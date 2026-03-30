"use client"

import { Download } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface PdfDownloadButtonProps {
  content: string
  fileName?: string
}

export function PdfDownloadButton({ content, fileName = "proposal" }: PdfDownloadButtonProps) {
  const [generating, setGenerating] = useState(false)

  async function handleDownload() {
    setGenerating(true)

    try {
      const { default: html2pdf } = await import("html2pdf.js")

      const container = document.createElement("div")
      container.style.padding = "40px"
      container.style.fontFamily = "'Noto Sans JP', sans-serif"
      container.style.fontSize = "14px"
      container.style.lineHeight = "1.8"
      container.style.color = "#1a1a1a"

      const html = content
        .replace(/^# (.+)$/gm, "<h1 style='font-size:24px;margin-bottom:16px'>$1</h1>")
        .replace(
          /^## (.+)$/gm,
          "<h2 style='font-size:18px;margin-top:24px;margin-bottom:12px'>$1</h2>",
        )
        .replace(
          /^### (.+)$/gm,
          "<h3 style='font-size:16px;margin-top:16px;margin-bottom:8px'>$1</h3>",
        )
        .replace(/^- (.+)$/gm, "<li style='margin-left:20px'>$1</li>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n\n/g, "<br><br>")
        .replace(/\n/g, "<br>")

      container.innerHTML = html

      await html2pdf()
        .set({
          margin: 10,
          filename: `${fileName}.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(container)
        .save()
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button onClick={handleDownload} variant="outline" size="sm" disabled={generating}>
      <Download className="mr-2 h-4 w-4" />
      {generating ? "生成中..." : "PDF"}
    </Button>
  )
}
