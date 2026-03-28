import { EngineerForm } from "../_components/engineer-form"

export default function NewEngineerPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">エンジニア登録</h1>
      <EngineerForm mode="create" />
    </div>
  )
}
