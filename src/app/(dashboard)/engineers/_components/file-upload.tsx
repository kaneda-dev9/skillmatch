"use client"

import { FileText, Loader2, Upload, X } from "lucide-react"
import { useRef, useState } from "react"
import { parseDocument, uploadFile } from "@/actions/engineers"
import { Button } from "@/components/ui/button"

interface FileUploadProps {
  onParsed: (result: {
    data: Record<string, unknown>
    rawText: string
    fileName: string
    filePath: string
    fileType: string
  }) => void
  onError: (message: string) => void
}

const ACCEPTED_TYPES = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
}

export function FileUpload({ onParsed, onError }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setFileName(file.name)

    try {
      // 1. Supabase Storage にアップロード
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)
      const uploadResult = await uploadFile(uploadFormData)
      if ("error" in uploadResult && uploadResult.error) {
        onError(uploadResult.error)
        setUploading(false)
        return
      }

      // 2. Claude で解析
      const parseFormData = new FormData()
      parseFormData.append("file", file)
      const parseResult = await parseDocument(parseFormData)
      if ("error" in parseResult && parseResult.error) {
        onError(parseResult.error)
        setUploading(false)
        return
      }

      const filePath = ("filePath" in uploadResult ? uploadResult.filePath : "") ?? ""

      onParsed({
        data: ("data" in parseResult ? parseResult.data : {}) as Record<string, unknown>,
        rawText: ("rawText" in parseResult ? parseResult.rawText : "") ?? "",
        fileName: ("fileName" in parseResult ? parseResult.fileName : "") ?? "",
        filePath,
        fileType: ("fileType" in parseResult ? parseResult.fileType : "") ?? "",
      })
    } catch {
      onError("ファイルの処理中にエラーが発生しました")
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleClear() {
    setFileName(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: ドロップゾーンのため
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-muted-foreground/50"
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">スキルシートを解析中...</p>
        </div>
      ) : fileName ? (
        <div className="flex items-center justify-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">{fileName}</span>
          <Button variant="ghost" size="icon-xs" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">ファイルをドラッグ＆ドロップ</p>
            <p className="text-xs text-muted-foreground">PDF, Word, Excel（10MB以下）</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            ファイルを選択
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={Object.values(ACCEPTED_TYPES).join(",")}
            onChange={handleChange}
            className="hidden"
          />
        </div>
      )}
    </div>
  )
}
