"use client"

import { Loader2, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createProject, updateProject } from "@/actions/projects"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Availability, Project, Skill } from "@/types"

interface ProjectFormProps {
  project?: Project
  mode: "create" | "edit"
}

export function ProjectForm({ project, mode }: ProjectFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const [title, setTitle] = useState(project?.title ?? "")
  const [clientName, setClientName] = useState(project?.client_name ?? "")
  const [skills, setSkills] = useState<Skill[]>(project?.required_skills ?? [])
  const [experienceYears, setExperienceYears] = useState(project?.experience_years ?? 0)
  const [industries, setIndustries] = useState<string[]>(project?.industries ?? [])
  const [conditions, setConditions] = useState<Availability>(
    project?.conditions ?? {
      rate_min: null,
      rate_max: null,
      start_date: null,
      remote: false,
      location: null,
    },
  )
  const [description, setDescription] = useState(project?.description ?? "")
  const [status, setStatus] = useState<"open" | "closed">(
    (project?.status as "open" | "closed") ?? "open",
  )
  const [newIndustry, setNewIndustry] = useState("")

  function addSkill() {
    setSkills([...skills, { name: "", level: "intermediate", years: 0 }])
  }

  function removeSkill(index: number) {
    setSkills(skills.filter((_, i) => i !== index))
  }

  function updateSkill(index: number, field: keyof Skill, value: string | number) {
    const updated = [...skills]
    updated[index] = { ...updated[index], [field]: value }
    setSkills(updated)
  }

  function addIndustry() {
    if (newIndustry && !industries.includes(newIndustry)) {
      setIndustries([...industries, newIndustry])
      setNewIndustry("")
    }
  }

  function removeIndustry(industry: string) {
    setIndustries(industries.filter((i) => i !== industry))
  }

  async function handleSubmit() {
    setPending(true)
    setError(null)

    const formData = new FormData()
    formData.append(
      "data",
      JSON.stringify({
        title,
        client_name: clientName,
        required_skills: skills,
        experience_years: experienceYears,
        industries,
        conditions,
        description,
        status,
      }),
    )

    const result =
      mode === "create" ? await createProject(formData) : await updateProject(project!.id, formData)

    if (result?.error) {
      setError(result.error)
      setPending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">タイトル *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_name">クライアント名 *</Label>
              <Input
                id="client_name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="experience">必要経験年数</Label>
              <Input
                id="experience"
                type="number"
                min={0}
                value={experienceYears}
                onChange={(e) => setExperienceYears(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">ステータス</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v as "open" | "closed")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">募集中</SelectItem>
                  <SelectItem value="closed">終了</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">案件説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="案件の詳細を記入..."
            />
          </div>
        </CardContent>
      </Card>

      {/* 要求スキル */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>要求スキル</CardTitle>
          <Button variant="outline" size="sm" onClick={addSkill}>
            <Plus className="mr-1 h-4 w-4" />
            追加
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {skills.map((skill, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skills have no unique ID
            <div key={i} className="flex items-center gap-3">
              <Input
                placeholder="スキル名"
                value={skill.name}
                onChange={(e) => updateSkill(i, "name", e.target.value)}
                className="flex-1"
              />
              <Select value={skill.level} onValueChange={(v) => v && updateSkill(i, "level", v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">初級</SelectItem>
                  <SelectItem value="intermediate">中級</SelectItem>
                  <SelectItem value="advanced">上級</SelectItem>
                  <SelectItem value="expert">エキスパート</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                placeholder="年数"
                value={skill.years}
                onChange={(e) => updateSkill(i, "years", Number(e.target.value))}
                className="w-20"
              />
              <Button variant="ghost" size="icon-xs" onClick={() => removeSkill(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 業界 */}
      <Card>
        <CardHeader>
          <CardTitle>業界</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {industries.map((industry) => (
              <Badge
                key={industry}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeIndustry(industry)}
              >
                {industry} ×
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="業界を追加（例: 金融）"
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addIndustry()
                }
              }}
            />
            <Button variant="outline" size="sm" onClick={addIndustry}>
              追加
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 稼働条件 */}
      <Card>
        <CardHeader>
          <CardTitle>稼働条件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>最低単価（円/月）</Label>
              <Input
                type="number"
                value={conditions.rate_min ?? ""}
                onChange={(e) =>
                  setConditions({
                    ...conditions,
                    rate_min: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>最高単価（円/月）</Label>
              <Input
                type="number"
                value={conditions.rate_max ?? ""}
                onChange={(e) =>
                  setConditions({
                    ...conditions,
                    rate_max: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>稼働開始日</Label>
              <Input
                type="date"
                value={conditions.start_date ?? ""}
                onChange={(e) =>
                  setConditions({
                    ...conditions,
                    start_date: e.target.value || null,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>勤務地</Label>
              <Input
                value={conditions.location ?? ""}
                onChange={(e) =>
                  setConditions({
                    ...conditions,
                    location: e.target.value || null,
                  })
                }
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={conditions.remote}
              onChange={(e) => setConditions({ ...conditions, remote: e.target.checked })}
              className="cursor-pointer rounded"
            />
            リモートワーク可
          </label>
        </CardContent>
      </Card>

      {/* エラー + 送信 */}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "登録" : "更新"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
      </div>
    </div>
  )
}
