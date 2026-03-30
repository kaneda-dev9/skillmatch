import { getSkillColor } from "@/lib/skill-colors"

interface SkillBadgeProps {
  name: string
}

export function SkillBadge({ name }: SkillBadgeProps) {
  const color = getSkillColor(name)

  return (
    <span
      style={{
        backgroundColor: color.bg,
        color: color.text,
        borderColor: color.border,
      }}
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
    >
      {name}
    </span>
  )
}
