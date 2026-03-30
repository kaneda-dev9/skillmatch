"use client"

import { Loader2, Zap } from "lucide-react"
import { useActionState } from "react"
import { executeMatching } from "@/actions/matching"
import { Button } from "@/components/ui/button"

interface ExecuteMatchingButtonProps {
  projectId: string
  variant?: "default" | "outline"
  size?: "default" | "sm"
}

export function ExecuteMatchingButton({
  projectId,
  variant = "default",
  size = "default",
}: ExecuteMatchingButtonProps) {
  const [state, action, isPending] = useActionState(() => executeMatching(projectId), null)

  return (
    <form action={action}>
      <Button type="submit" variant={variant} size={size} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            マッチング実行中...
          </>
        ) : (
          <>
            <Zap className="mr-2 h-4 w-4" />
            マッチング実行
          </>
        )}
      </Button>
      {state?.error && <p className="mt-2 text-sm text-destructive">{state.error}</p>}
    </form>
  )
}
