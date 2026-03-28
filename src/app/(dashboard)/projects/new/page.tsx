import { ProjectForm } from "../_components/project-form"

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">案件登録</h1>
      <ProjectForm mode="create" />
    </div>
  )
}
