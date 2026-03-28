"use client"

import { Loader2, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createEngineer, updateEngineer } from "@/actions/engineers"
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
import type { Availability, Engineer, Skill, SoftSkill } from "@/types"
import { FileUpload } from "./file-upload"

interface EngineerFormProps {
  engineer?: Engineer
  mode: "create" | "edit"
}

export function EngineerForm({ engineer, mode }: EngineerFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const [name, setName] = useState(engineer?.name ?? "")
  const [email, setEmail] = useState(engineer?.email ?? "")
  const [skills, setSkills] = useState<Skill[]>(engineer?.skills ?? [])
  const [experienceYears, setExperienceYears] = useState(engineer?.experience_years ?? 0)
  const [industries, setIndustries] = useState<string[]>(engineer?.industries ?? [])
  const [availability, setAvailability] = useState<Availability>(
    engineer?.availability ?? {
      rate_min: null,
      rate_max: null,
      start_date: null,
      remote: false,
      location: null,
    },
  )
  const [softSkills, setSoftSkills] = useState<SoftSkill[]>(engineer?.soft_skills ?? [])
  const [rawText, setRawText] = useState(engineer?.raw_text ?? "")
  const [fileInfo, setFileInfo] = useState<{
    fileName: string
    filePath: string
    fileType: string
  } | null>(null)

  const [newIndustry, setNewIndustry] = useState("")

  function handleParsed(result: {
    data: Record<string, unknown>
    rawText: string
    fileName: string
    filePath: string
    fileType: string
  }) {
    const d = result.data as {
      name?: string
      email?: string | null
      skills?: Skill[]
      experience_years?: number
      industries?: string[]
      availability?: Availability
      soft_skills?: SoftSkill[]
    }
    if (d.name) setName(d.name)
    if (d.email) setEmail(d.email)
    if (d.skills) setSkills(d.skills)
    if (d.experience_years) setExperienceYears(d.experience_years)
    if (d.industries) setIndustries(d.industries)
    if (d.availability) setAvailability(d.availability)
    if (d.soft_skills) setSoftSkills(d.soft_skills)
    setRawText(result.rawText)
    setFileInfo({
      fileName: result.fileName,
      filePath: result.filePath,
      fileType: result.fileType,
    })
  }

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

  function addSoftSkill() {
    setSoftSkills([...softSkills, { name: "", description: null }])
  }

  function removeSoftSkill(index: number) {
    setSoftSkills(softSkills.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    setPending(true)
    setError(null)

    const formData = new FormData()
    formData.append(
      "data",
      JSON.stringify({
        name,
        email: email || null,
        skills,
        experience_years: experienceYears,
        industries,
        availability,
        soft_skills: softSkills,
      }),
    )
    formData.append("rawText", rawText)
    if (fileInfo) {
      formData.append("fileName", fileInfo.fileName)
      formData.append("filePath", fileInfo.filePath)
      formData.append("fileType", fileInfo.fileType)
    }

    const result =
      mode === "create"
        ? await createEngineer(formData)
        : await updateEngineer(engineer!.id, formData)

    if (result?.error) {
      setError(result.error)
      setPending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ファイルアップロード */}
      <Card>
        <CardHeader>
          <CardTitle>スキルシートから自動入力</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload onParsed={handleParsed} onError={(msg) => setError(msg)} />
        </CardContent>
      </Card>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">名前 *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience">総経験年数 *</Label>
            <Input
              id="experience"
              type="number"
              min={0}
              value={experienceYears}
              onChange={(e) => setExperienceYears(Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* スキル */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>スキル</CardTitle>
          <Button variant="outline" size="sm" onClick={addSkill}>
            <Plus className="mr-1 h-4 w-4" />
            追加
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {skills.map((skill, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: スキルに一意IDがないため
            <div key={`skill-${i}`} className="flex items-center gap-3">
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
          <CardTitle>業界経験</CardTitle>
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
                {industry} x
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
                value={availability.rate_min ?? ""}
                onChange={(e) =>
                  setAvailability({
                    ...availability,
                    rate_min: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>最高単価（円/月）</Label>
              <Input
                type="number"
                value={availability.rate_max ?? ""}
                onChange={(e) =>
                  setAvailability({
                    ...availability,
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
                value={availability.start_date ?? ""}
                onChange={(e) =>
                  setAvailability({
                    ...availability,
                    start_date: e.target.value || null,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>勤務地</Label>
              <Input
                value={availability.location ?? ""}
                onChange={(e) =>
                  setAvailability({
                    ...availability,
                    location: e.target.value || null,
                  })
                }
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={availability.remote}
              onChange={(e) => setAvailability({ ...availability, remote: e.target.checked })}
              className="rounded"
            />
            リモートワーク可
          </label>
        </CardContent>
      </Card>

      {/* ソフトスキル */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>ソフトスキル</CardTitle>
          <Button variant="outline" size="sm" onClick={addSoftSkill}>
            <Plus className="mr-1 h-4 w-4" />
            追加
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {softSkills.map((ss, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: ソフトスキルに一意IDがないため
            <div key={`soft-${i}`} className="flex items-center gap-3">
              <Input
                placeholder="スキル名（例: リーダーシップ）"
                value={ss.name}
                onChange={(e) => {
                  const updated = [...softSkills]
                  updated[i] = { ...updated[i], name: e.target.value }
                  setSoftSkills(updated)
                }}
                className="flex-1"
              />
              <Button variant="ghost" size="icon-xs" onClick={() => removeSoftSkill(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
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
