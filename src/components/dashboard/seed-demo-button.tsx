"use client"

import { Loader2, Sparkles } from "lucide-react"
import { useCallback, useState, useTransition } from "react"
import { seedDemoData } from "@/actions/seed"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface SeedDemoButtonProps {
  hasData: boolean
}

export function SeedDemoButton({ hasData }: SeedDemoButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const handleSeed = useCallback(() => {
    setOpen(false)
    setResult(null)
    startTransition(async () => {
      const res = await seedDemoData()
      if ("error" in res && res.error) {
        setResult({ type: "error", message: res.error })
      } else {
        setResult({
          type: "success",
          message: `エンジニア${res.engineers}名、案件${res.projects}件を投入しました`,
        })
      }
    })
  }, [])

  return (
    <div className="flex items-center gap-3">
      {result && (
        <p
          className={`text-sm ${result.type === "success" ? "text-emerald-600" : "text-destructive"}`}
        >
          {result.message}
        </p>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          disabled={isPending}
          render={
            <Button variant="outline" size="sm" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  投入中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  デモデータを投入
                </>
              )}
            </Button>
          }
        />
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {hasData ? "既にデータが登録されています" : "デモデータを投入しますか？"}
            </DialogTitle>
            <DialogDescription>
              {hasData
                ? "既存データに加えて、デモ用のエンジニア9名と案件6件が追加されます。重複にご注意ください。"
                : "デモ用のエンジニア9名と案件6件を登録します。投入後すぐにマッチングを試せます。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>キャンセル</DialogClose>
            <Button onClick={handleSeed}>投入する</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
