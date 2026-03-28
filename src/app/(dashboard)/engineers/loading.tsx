export default function EngineersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-10 w-full max-w-md animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: スケルトンに一意IDがないため
          <div key={i} className="flex gap-4">
            <div className="h-10 flex-1 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
