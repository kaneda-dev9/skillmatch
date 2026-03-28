# Phase 2: エンジニア管理 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** エンジニア情報の CRUD、PDF/Word/Excel からの AI 構造化、Embedding 生成によるベクトル検索基盤を構築する。

**Architecture:** Next.js Server Actions でビジネスロジックを実装。Claude でドキュメント解析→構造化、OpenAI で Embedding 生成。Supabase Storage でファイル管理、pgvector でベクトル保存。

**Tech Stack:** Next.js 16, Supabase, AI SDK 6 (Claude + OpenAI), Zod, mammoth, xlsx, shadcn/ui

---

## ファイル構成

```
src/
├── app/(dashboard)/
│   └── engineers/
│       ├── page.tsx                    ← 一覧（Server Component）
│       ├── new/
│       │   └── page.tsx               ← 新規登録
│       ├── [id]/
│       │   ├── page.tsx               ← 詳細
│       │   └── edit/
│       │       └── page.tsx           ← 編集
│       └── _components/
│           ├── engineer-table.tsx      ← 一覧テーブル（Client）
│           ├── engineer-form.tsx       ← 登録・編集フォーム（Client）
│           ├── engineer-detail.tsx     ← 詳細タブ表示（Client）
│           ├── file-upload.tsx         ← ファイルアップロード（Client）
│           ├── file-preview.tsx        ← ファイルプレビュー（Client）
│           └── search-filter.tsx       ← 検索・フィルタ（Client）
├── actions/
│   └── engineers.ts                   ← Server Actions
├── lib/
│   ├── ai/
│   │   ├── provider.ts                ← 既存
│   │   ├── parse-document.ts          ← ドキュメント解析
│   │   └── embedding.ts              ← Embedding 生成
│   └── validations/
│       └── engineer.ts               ← Zod スキーマ
└── components/
    └── ui/                            ← shadcn/ui 追加コンポーネント
```

---

### Task 1: 追加パッケージのインストール + shadcn/ui コンポーネント追加

**Files:**
- Modify: `package.json`
- Create: `src/components/ui/tabs.tsx` (shadcn)
- Create: `src/components/ui/table.tsx` (shadcn)
- Create: `src/components/ui/dialog.tsx` (shadcn)
- Create: `src/components/ui/select.tsx` (shadcn)
- Create: `src/components/ui/badge.tsx` (shadcn)
- Create: `src/components/ui/textarea.tsx` (shadcn)

- [ ] **Step 1: Word/Excel 解析パッケージをインストール**

```bash
pnpm add mammoth xlsx
```

- [ ] **Step 2: shadcn/ui コンポーネントを追加**

```bash
pnpm dlx shadcn@latest add tabs table dialog select badge textarea -y -o
```

- [ ] **Step 3: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 4: コミット**

```bash
git add package.json pnpm-lock.yaml src/components/ui/
git commit -m "feat: Phase 2 用パッケージ + shadcn/ui コンポーネント追加"
```

---

### Task 2: Zod バリデーションスキーマ

**Files:**
- Create: `src/lib/validations/engineer.ts`
- Create: `src/lib/validations/engineer.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/lib/validations/engineer.test.ts
import { describe, expect, it } from "vitest";
import { engineerFormSchema, engineerParseSchema } from "./engineer";

describe("engineerFormSchema", () => {
  it("有効なデータを通す", () => {
    const data = {
      name: "田中太郎",
      email: "tanaka@example.com",
      skills: [{ name: "TypeScript", level: "advanced", years: 5 }],
      experience_years: 10,
      industries: ["金融"],
      availability: {
        rate_min: 500000,
        rate_max: 800000,
        start_date: "2026-04-01",
        remote: true,
        location: null,
      },
      soft_skills: [{ name: "リーダーシップ", description: null }],
    };
    const result = engineerFormSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("名前が空の場合エラー", () => {
    const data = { name: "", skills: [], experience_years: 0 };
    const result = engineerFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("スキルレベルが不正な場合エラー", () => {
    const data = {
      name: "テスト",
      skills: [{ name: "JS", level: "master", years: 1 }],
      experience_years: 1,
    };
    const result = engineerFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("engineerParseSchema", () => {
  it("Claude の構造化出力を検証する", () => {
    const data = {
      name: "田中太郎",
      email: null,
      skills: [{ name: "React", level: "expert", years: 8 }],
      experience_years: 12,
      industries: ["EC", "金融"],
      availability: {
        rate_min: null,
        rate_max: null,
        start_date: null,
        remote: false,
        location: "東京",
      },
      soft_skills: [],
    };
    const result = engineerParseSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm run test src/lib/validations/engineer.test.ts`
Expected: FAIL（モジュールが存在しない）

- [ ] **Step 3: スキーマを実装**

```typescript
// src/lib/validations/engineer.ts
import { z } from "zod/v4";

const skillSchema = z.object({
  name: z.string().min(1),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  years: z.number().min(0),
});

const availabilitySchema = z.object({
  rate_min: z.number().nullable().default(null),
  rate_max: z.number().nullable().default(null),
  start_date: z.string().nullable().default(null),
  remote: z.boolean().default(false),
  location: z.string().nullable().default(null),
});

const softSkillSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().default(null),
});

export const engineerFormSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email().nullable().optional().default(null),
  skills: z.array(skillSchema).default([]),
  experience_years: z.number().min(0).default(0),
  industries: z.array(z.string()).default([]),
  availability: availabilitySchema.default({}),
  soft_skills: z.array(softSkillSchema).default([]),
});

export const engineerParseSchema = z.object({
  name: z.string(),
  email: z.string().nullable(),
  skills: z.array(skillSchema),
  experience_years: z.number(),
  industries: z.array(z.string()),
  availability: availabilitySchema,
  soft_skills: z.array(softSkillSchema),
});

export type EngineerFormData = z.infer<typeof engineerFormSchema>;
export type EngineerParseData = z.infer<typeof engineerParseSchema>;
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm run test src/lib/validations/engineer.test.ts`
Expected: PASS（3件）

- [ ] **Step 5: コミット**

```bash
git add src/lib/validations/
git commit -m "feat: エンジニア用 Zod バリデーションスキーマを追加"
```

---

### Task 3: ドキュメント解析ロジック（Claude 構造化）

**Files:**
- Create: `src/lib/ai/parse-document.ts`
- Create: `src/lib/ai/parse-document.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/lib/ai/parse-document.test.ts
import { describe, expect, it } from "vitest";
import { extractTextFromDocx, extractTextFromXlsx } from "./parse-document";

describe("extractTextFromDocx", () => {
  it("関数が定義されている", () => {
    expect(extractTextFromDocx).toBeDefined();
    expect(typeof extractTextFromDocx).toBe("function");
  });
});

describe("extractTextFromXlsx", () => {
  it("関数が定義されている", () => {
    expect(extractTextFromXlsx).toBeDefined();
    expect(typeof extractTextFromXlsx).toBe("function");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm run test src/lib/ai/parse-document.test.ts`
Expected: FAIL

- [ ] **Step 3: ドキュメント解析ロジックを実装**

```typescript
// src/lib/ai/parse-document.ts
import { generateText, Output } from "ai";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { llm } from "./provider";
import { engineerParseSchema } from "@/lib/validations/engineer";
import type { EngineerParseData } from "@/lib/validations/engineer";

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export function extractTextFromXlsx(buffer: Buffer): string {
  const workbook = XLSX.read(buffer);
  const texts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    texts.push(`[${sheetName}]\n${csv}`);
  }
  return texts.join("\n\n");
}

const PARSE_PROMPT = `以下のスキルシート/職務経歴書から、エンジニアの情報を構造化してください。

抽出ルール:
- name: フルネーム
- email: メールアドレス（見つからなければ null）
- skills: 各技術スキル。level は beginner/intermediate/advanced/expert で判定。years は経験年数
- experience_years: IT業界全体での経験年数
- industries: 経験した業界（金融、医療、EC、製造、公共 など）
- availability: 単価、稼働開始日、リモート可否、勤務地（記載がなければ null/false）
- soft_skills: マネジメント、リーダー経験、コミュニケーション等

記載がない項目は null、空配列、false などデフォルト値にしてください。`;

export async function parseDocumentWithAI(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<{ data: EngineerParseData; rawText: string }> {
  let rawText: string;
  let messages: Parameters<typeof generateText>[0]["messages"];

  if (mimeType === "application/pdf") {
    rawText = "[PDFファイル - テキストはAIが直接抽出]";
    messages = [
      {
        role: "user",
        content: [
          { type: "file", data: fileBuffer, mimeType: "application/pdf" },
          { type: "text", text: PARSE_PROMPT },
        ],
      },
    ];
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    rawText = await extractTextFromDocx(fileBuffer);
    messages = [
      {
        role: "user",
        content: `${PARSE_PROMPT}\n\n---\n\n${rawText}`,
      },
    ];
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    rawText = extractTextFromXlsx(fileBuffer);
    messages = [
      {
        role: "user",
        content: `${PARSE_PROMPT}\n\n---\n\n${rawText}`,
      },
    ];
  } else {
    throw new Error(`未対応のファイル形式: ${mimeType}`);
  }

  const result = await generateText({
    model: llm,
    output: Output.object({ schema: engineerParseSchema }),
    messages,
  });

  return { data: result.output, rawText };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm run test src/lib/ai/parse-document.test.ts`
Expected: PASS（2件）

- [ ] **Step 5: コミット**

```bash
git add src/lib/ai/parse-document.ts src/lib/ai/parse-document.test.ts
git commit -m "feat: ドキュメント解析ロジック（PDF/Word/Excel → Claude 構造化）を追加"
```

---

### Task 4: Embedding 生成ロジック

**Files:**
- Create: `src/lib/ai/embedding.ts`
- Create: `src/lib/ai/embedding.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/lib/ai/embedding.test.ts
import { describe, expect, it } from "vitest";
import { buildEmbeddingText } from "./embedding";

describe("buildEmbeddingText", () => {
  it("エンジニア情報からEmbedding用テキストを生成する", () => {
    const engineer = {
      name: "田中太郎",
      skills: [
        { name: "TypeScript", level: "advanced" as const, years: 5 },
        { name: "React", level: "expert" as const, years: 8 },
      ],
      experience_years: 10,
      industries: ["金融", "EC"],
      availability: {
        rate_min: 500000,
        rate_max: 800000,
        start_date: null,
        remote: true,
        location: null,
      },
      soft_skills: [{ name: "リーダーシップ", description: null }],
    };
    const text = buildEmbeddingText(engineer);
    expect(text).toContain("TypeScript");
    expect(text).toContain("React");
    expect(text).toContain("金融");
    expect(text).toContain("リーダーシップ");
    expect(text).toContain("リモート可");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm run test src/lib/ai/embedding.test.ts`
Expected: FAIL

- [ ] **Step 3: Embedding ロジックを実装**

```typescript
// src/lib/ai/embedding.ts
import { embed } from "ai";
import { embeddingModel } from "./provider";
import type { EngineerFormData } from "@/lib/validations/engineer";

type EmbeddingInput = Pick<
  EngineerFormData,
  "name" | "skills" | "experience_years" | "industries" | "availability" | "soft_skills"
>;

export function buildEmbeddingText(engineer: EmbeddingInput): string {
  const parts: string[] = [];

  parts.push(`名前: ${engineer.name}`);
  parts.push(`経験年数: ${engineer.experience_years}年`);

  if (engineer.skills.length > 0) {
    const skillTexts = engineer.skills.map(
      (s) => `${s.name}(${s.level}, ${s.years}年)`,
    );
    parts.push(`スキル: ${skillTexts.join(", ")}`);
  }

  if (engineer.industries.length > 0) {
    parts.push(`業界: ${engineer.industries.join(", ")}`);
  }

  if (engineer.availability) {
    const avail = engineer.availability;
    const conditions: string[] = [];
    if (avail.rate_min || avail.rate_max) {
      conditions.push(`単価: ${avail.rate_min ?? "?"}〜${avail.rate_max ?? "?"}`);
    }
    if (avail.remote) conditions.push("リモート可");
    if (avail.location) conditions.push(`勤務地: ${avail.location}`);
    if (avail.start_date) conditions.push(`稼働開始: ${avail.start_date}`);
    if (conditions.length > 0) {
      parts.push(`稼働条件: ${conditions.join(", ")}`);
    }
  }

  if (engineer.soft_skills.length > 0) {
    parts.push(
      `ソフトスキル: ${engineer.soft_skills.map((s) => s.name).join(", ")}`,
    );
  }

  return parts.join("\n");
}

export async function generateEmbedding(
  engineer: EmbeddingInput,
): Promise<number[]> {
  const text = buildEmbeddingText(engineer);
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  return embedding;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm run test src/lib/ai/embedding.test.ts`
Expected: PASS（1件）

- [ ] **Step 5: コミット**

```bash
git add src/lib/ai/embedding.ts src/lib/ai/embedding.test.ts
git commit -m "feat: Embedding 生成ロジック（buildEmbeddingText + generateEmbedding）を追加"
```

---

### Task 5: Server Actions（エンジニア CRUD）

**Files:**
- Create: `src/actions/engineers.ts`

- [ ] **Step 1: Server Actions を実装**

```typescript
// src/actions/engineers.ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { engineerFormSchema } from "@/lib/validations/engineer";
import { parseDocumentWithAI } from "@/lib/ai/parse-document";
import { generateEmbedding } from "@/lib/ai/embedding";

export async function parseDocument(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) return { error: "ファイルが選択されていません" };

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (!allowedTypes.includes(file.type)) {
    return { error: "PDF、Word、Excel ファイルのみ対応しています" };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: "ファイルサイズは10MB以下にしてください" };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, rawText } = await parseDocumentWithAI(buffer, file.type, file.name);
    return { data, rawText, fileName: file.name, fileType: file.type };
  } catch {
    return { error: "ファイルの解析に失敗しました。手動で入力してください。" };
  }
}

export async function createEngineer(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "ユーザープロフィールが見つかりません" };

  const raw = JSON.parse(formData.get("data") as string);
  const parsed = engineerFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "入力内容に不備があります" };
  }

  const engineerData = parsed.data;
  const rawText = (formData.get("rawText") as string) ?? "";

  // Embedding 生成（失敗してもエンジニア情報は保存する）
  let embedding: number[] | null = null;
  try {
    embedding = await generateEmbedding(engineerData);
  } catch {
    // Embedding 生成失敗 — 後でリトライ可能
  }

  const { data: engineer, error } = await supabase
    .from("engineers")
    .insert({
      org_id: profile.org_id,
      name: engineerData.name,
      email: engineerData.email,
      skills: engineerData.skills,
      experience_years: engineerData.experience_years,
      industries: engineerData.industries,
      availability: engineerData.availability,
      soft_skills: engineerData.soft_skills,
      raw_text: rawText,
      embedding,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // ファイル情報がある場合は documents テーブルにも保存
  const fileName = formData.get("fileName") as string | null;
  const filePath = formData.get("filePath") as string | null;
  const fileType = formData.get("fileType") as string | null;

  if (fileName && filePath && fileType) {
    await supabase.from("documents").insert({
      org_id: profile.org_id,
      engineer_id: engineer.id,
      file_name: fileName,
      file_path: filePath,
      file_type: fileType,
      parsed_content: rawText,
    });
  }

  revalidatePath("/engineers");
  redirect("/engineers");
}

export async function updateEngineer(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const raw = JSON.parse(formData.get("data") as string);
  const parsed = engineerFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "入力内容に不備があります" };
  }

  const engineerData = parsed.data;
  const rawText = (formData.get("rawText") as string) ?? "";

  let embedding: number[] | null = null;
  try {
    embedding = await generateEmbedding(engineerData);
  } catch {
    // Embedding 生成失敗
  }

  const { error } = await supabase
    .from("engineers")
    .update({
      name: engineerData.name,
      email: engineerData.email,
      skills: engineerData.skills,
      experience_years: engineerData.experience_years,
      industries: engineerData.industries,
      availability: engineerData.availability,
      soft_skills: engineerData.soft_skills,
      raw_text: rawText,
      embedding,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  // 再アップロードされた場合
  const fileName = formData.get("fileName") as string | null;
  const filePath = formData.get("filePath") as string | null;
  const fileType = formData.get("fileType") as string | null;

  if (fileName && filePath && fileType) {
    // 古い documents を削除
    await supabase.from("documents").delete().eq("engineer_id", id);
    // 新しい documents を追加
    const { data: profile } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (profile) {
      await supabase.from("documents").insert({
        org_id: profile.org_id,
        engineer_id: id,
        file_name: fileName,
        file_path: filePath,
        file_type: fileType,
        parsed_content: rawText,
      });
    }
  }

  revalidatePath("/engineers");
  revalidatePath(`/engineers/${id}`);
  redirect(`/engineers/${id}`);
}

export async function deleteEngineer(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // Storage からファイル削除
  const { data: docs } = await supabase
    .from("documents")
    .select("file_path")
    .eq("engineer_id", id);

  if (docs && docs.length > 0) {
    const paths = docs.map((d) => d.file_path);
    await supabase.storage.from("documents").remove(paths);
  }

  const { error } = await supabase.from("engineers").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/engineers");
  redirect("/engineers");
}

export async function uploadFile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "ユーザープロフィールが見つかりません" };

  const file = formData.get("file") as File;
  if (!file) return { error: "ファイルが選択されていません" };

  const filePath = `${profile.org_id}/${crypto.randomUUID()}/${file.name}`;
  const { error } = await supabase.storage
    .from("documents")
    .upload(filePath, file);

  if (error) return { error: error.message };

  return { filePath };
}
```

- [ ] **Step 2: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add src/actions/engineers.ts
git commit -m "feat: エンジニア CRUD Server Actions を追加"
```

---

### Task 6: エンジニア一覧画面

**Files:**
- Create: `src/app/(dashboard)/engineers/page.tsx`
- Create: `src/app/(dashboard)/engineers/_components/engineer-table.tsx`
- Create: `src/app/(dashboard)/engineers/_components/search-filter.tsx`

- [ ] **Step 1: 検索・フィルタコンポーネントを作成**

```tsx
// src/app/(dashboard)/engineers/_components/search-filter.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export function SearchFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [remoteOnly, setRemoteOnly] = useState(searchParams.get("remote") === "true");

  function handleSearch() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (remoteOnly) params.set("remote", "true");
    router.push(`/engineers?${params.toString()}`);
  }

  function handleClear() {
    setQuery("");
    setRemoteOnly(false);
    router.push("/engineers");
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="名前・スキルで検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="pl-9"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={remoteOnly}
          onChange={(e) => setRemoteOnly(e.target.checked)}
          className="rounded"
        />
        リモート可のみ
      </label>
      <Button onClick={handleSearch} size="sm">
        検索
      </Button>
      {(query || remoteOnly) && (
        <Button onClick={handleClear} variant="ghost" size="sm">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: テーブルコンポーネントを作成**

```tsx
// src/app/(dashboard)/engineers/_components/engineer-table.tsx
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Engineer } from "@/types";

interface EngineerTableProps {
  engineers: Engineer[];
}

export function EngineerTable({ engineers }: EngineerTableProps) {
  if (engineers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>エンジニアが登録されていません</p>
        <Link href="/engineers/new" className="mt-2 text-primary underline">
          エンジニアを登録する
        </Link>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>名前</TableHead>
          <TableHead>スキル</TableHead>
          <TableHead>経験年数</TableHead>
          <TableHead>業界</TableHead>
          <TableHead>リモート</TableHead>
          <TableHead>登録日</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {engineers.map((engineer) => (
          <TableRow key={engineer.id} className="cursor-pointer">
            <TableCell>
              <Link
                href={`/engineers/${engineer.id}`}
                className="font-medium text-primary hover:underline"
              >
                {engineer.name}
              </Link>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {engineer.skills.slice(0, 3).map((skill) => (
                  <Badge key={skill.name} variant="secondary">
                    {skill.name}
                  </Badge>
                ))}
                {engineer.skills.length > 3 && (
                  <Badge variant="outline">+{engineer.skills.length - 3}</Badge>
                )}
              </div>
            </TableCell>
            <TableCell>{engineer.experience_years}年</TableCell>
            <TableCell>{engineer.industries.join(", ") || "-"}</TableCell>
            <TableCell>{engineer.availability?.remote ? "可" : "-"}</TableCell>
            <TableCell>
              {new Date(engineer.created_at).toLocaleDateString("ja-JP")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: 一覧ページを作成**

```tsx
// src/app/(dashboard)/engineers/page.tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { EngineerTable } from "./_components/engineer-table";
import { SearchFilter } from "./_components/search-filter";

interface PageProps {
  searchParams: Promise<{ q?: string; remote?: string; sort?: string }>;
}

export default async function EngineersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("engineers")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.q) {
    query = query.or(
      `name.ilike.%${params.q}%,skills->0->>name.ilike.%${params.q}%`,
    );
  }

  if (params.remote === "true") {
    query = query.eq("availability->>remote", "true");
  }

  const { data: engineers } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">エンジニア</h1>
        <Button render={<Link href="/engineers/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          エンジニア登録
        </Button>
      </div>
      <SearchFilter />
      <EngineerTable engineers={engineers ?? []} />
    </div>
  );
}
```

- [ ] **Step 4: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功（`/engineers` ルートが表示される）

- [ ] **Step 5: コミット**

```bash
git add src/app/\(dashboard\)/engineers/
git commit -m "feat: エンジニア一覧画面（検索・フィルタ・テーブル）を追加"
```

---

### Task 7: ファイルアップロードコンポーネント

**Files:**
- Create: `src/app/(dashboard)/engineers/_components/file-upload.tsx`

- [ ] **Step 1: ファイルアップロードコンポーネントを作成**

```tsx
// src/app/(dashboard)/engineers/_components/file-upload.tsx
"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { parseDocument, uploadFile } from "@/actions/engineers";

interface FileUploadProps {
  onParsed: (result: {
    data: Record<string, unknown>;
    rawText: string;
    fileName: string;
    filePath: string;
    fileType: string;
  }) => void;
  onError: (message: string) => void;
}

const ACCEPTED_TYPES = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
};

export function FileUpload({ onParsed, onError }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setFileName(file.name);

    try {
      // 1. Supabase Storage にアップロード
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      const uploadResult = await uploadFile(uploadFormData);
      if ("error" in uploadResult) {
        onError(uploadResult.error);
        setUploading(false);
        return;
      }

      // 2. Claude で解析
      const parseFormData = new FormData();
      parseFormData.append("file", file);
      const parseResult = await parseDocument(parseFormData);
      if ("error" in parseResult) {
        onError(parseResult.error);
        setUploading(false);
        return;
      }

      onParsed({
        data: parseResult.data as Record<string, unknown>,
        rawText: parseResult.rawText,
        fileName: parseResult.fileName,
        filePath: uploadResult.filePath,
        fileType: parseResult.fileType,
      });
    } catch {
      onError("ファイルの処理中にエラーが発生しました");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleClear() {
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-muted-foreground/50"
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            スキルシートを解析中...
          </p>
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
            <p className="text-sm font-medium">
              ファイルをドラッグ＆ドロップ
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, Word, Excel（10MB以下）
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
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
  );
}
```

- [ ] **Step 2: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add src/app/\(dashboard\)/engineers/_components/file-upload.tsx
git commit -m "feat: ファイルアップロードコンポーネント（D&D + 解析）を追加"
```

---

### Task 8: エンジニア登録フォーム + 新規登録ページ

**Files:**
- Create: `src/app/(dashboard)/engineers/_components/engineer-form.tsx`
- Create: `src/app/(dashboard)/engineers/new/page.tsx`

- [ ] **Step 1: 登録・編集フォームコンポーネントを作成**

```tsx
// src/app/(dashboard)/engineers/_components/engineer-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { FileUpload } from "./file-upload";
import { createEngineer, updateEngineer } from "@/actions/engineers";
import type { Engineer, Skill, SoftSkill, Availability } from "@/types";

interface EngineerFormProps {
  engineer?: Engineer;
  mode: "create" | "edit";
}

export function EngineerForm({ engineer, mode }: EngineerFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [name, setName] = useState(engineer?.name ?? "");
  const [email, setEmail] = useState(engineer?.email ?? "");
  const [skills, setSkills] = useState<Skill[]>(engineer?.skills ?? []);
  const [experienceYears, setExperienceYears] = useState(
    engineer?.experience_years ?? 0,
  );
  const [industries, setIndustries] = useState<string[]>(
    engineer?.industries ?? [],
  );
  const [availability, setAvailability] = useState<Availability>(
    engineer?.availability ?? {
      rate_min: null,
      rate_max: null,
      start_date: null,
      remote: false,
      location: null,
    },
  );
  const [softSkills, setSoftSkills] = useState<SoftSkill[]>(
    engineer?.soft_skills ?? [],
  );
  const [rawText, setRawText] = useState(engineer?.raw_text ?? "");
  const [fileInfo, setFileInfo] = useState<{
    fileName: string;
    filePath: string;
    fileType: string;
  } | null>(null);

  const [newIndustry, setNewIndustry] = useState("");

  function handleParsed(result: {
    data: Record<string, unknown>;
    rawText: string;
    fileName: string;
    filePath: string;
    fileType: string;
  }) {
    const d = result.data as {
      name?: string;
      email?: string | null;
      skills?: Skill[];
      experience_years?: number;
      industries?: string[];
      availability?: Availability;
      soft_skills?: SoftSkill[];
    };
    if (d.name) setName(d.name);
    if (d.email) setEmail(d.email);
    if (d.skills) setSkills(d.skills);
    if (d.experience_years) setExperienceYears(d.experience_years);
    if (d.industries) setIndustries(d.industries);
    if (d.availability) setAvailability(d.availability);
    if (d.soft_skills) setSoftSkills(d.soft_skills);
    setRawText(result.rawText);
    setFileInfo({
      fileName: result.fileName,
      filePath: result.filePath,
      fileType: result.fileType,
    });
  }

  function addSkill() {
    setSkills([...skills, { name: "", level: "intermediate", years: 0 }]);
  }

  function removeSkill(index: number) {
    setSkills(skills.filter((_, i) => i !== index));
  }

  function updateSkill(index: number, field: keyof Skill, value: string | number) {
    const updated = [...skills];
    updated[index] = { ...updated[index], [field]: value };
    setSkills(updated);
  }

  function addIndustry() {
    if (newIndustry && !industries.includes(newIndustry)) {
      setIndustries([...industries, newIndustry]);
      setNewIndustry("");
    }
  }

  function removeIndustry(industry: string) {
    setIndustries(industries.filter((i) => i !== industry));
  }

  function addSoftSkill() {
    setSoftSkills([...softSkills, { name: "", description: null }]);
  }

  function removeSoftSkill(index: number) {
    setSoftSkills(softSkills.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setPending(true);
    setError(null);

    const formData = new FormData();
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
    );
    formData.append("rawText", rawText);
    if (fileInfo) {
      formData.append("fileName", fileInfo.fileName);
      formData.append("filePath", fileInfo.filePath);
      formData.append("fileType", fileInfo.fileType);
    }

    const result =
      mode === "create"
        ? await createEngineer(formData)
        : await updateEngineer(engineer!.id, formData);

    if (result?.error) {
      setError(result.error);
      setPending(false);
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
          <FileUpload
            onParsed={handleParsed}
            onError={(msg) => setError(msg)}
          />
        </CardContent>
      </Card>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">名前 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
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
            <div key={i} className="flex items-center gap-3">
              <Input
                placeholder="スキル名"
                value={skill.name}
                onChange={(e) => updateSkill(i, "name", e.target.value)}
                className="flex-1"
              />
              <Select
                value={skill.level}
                onValueChange={(v) => updateSkill(i, "level", v)}
              >
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
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => removeSkill(i)}
              >
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
                {industry} ×
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="業界を追加（例: 金融）"
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIndustry())}
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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
              onChange={(e) =>
                setAvailability({ ...availability, remote: e.target.checked })
              }
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
            <div key={i} className="flex items-center gap-3">
              <Input
                placeholder="スキル名（例: リーダーシップ）"
                value={ss.name}
                onChange={(e) => {
                  const updated = [...softSkills];
                  updated[i] = { ...updated[i], name: e.target.value };
                  setSoftSkills(updated);
                }}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => removeSoftSkill(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* エラー + 送信 */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
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
  );
}
```

- [ ] **Step 2: 新規登録ページを作成**

```tsx
// src/app/(dashboard)/engineers/new/page.tsx
import { EngineerForm } from "../_components/engineer-form";

export default function NewEngineerPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">エンジニア登録</h1>
      <EngineerForm mode="create" />
    </div>
  );
}
```

- [ ] **Step 3: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 4: コミット**

```bash
git add src/app/\(dashboard\)/engineers/
git commit -m "feat: エンジニア登録フォーム（フォーム入力 + ファイルアップロード）を追加"
```

---

### Task 9: エンジニア詳細画面 + ファイルプレビュー

**Files:**
- Create: `src/app/(dashboard)/engineers/[id]/page.tsx`
- Create: `src/app/(dashboard)/engineers/_components/engineer-detail.tsx`
- Create: `src/app/(dashboard)/engineers/_components/file-preview.tsx`

- [ ] **Step 1: ファイルプレビューコンポーネントを作成**

```tsx
// src/app/(dashboard)/engineers/_components/file-preview.tsx
"use client";

import type { Document } from "@/types";

interface FilePreviewProps {
  document: Document | null;
  storageUrl: string;
}

export function FilePreview({ document, storageUrl }: FilePreviewProps) {
  if (!document) {
    return (
      <p className="text-sm text-muted-foreground">
        ファイルがアップロードされていません
      </p>
    );
  }

  const fileUrl = `${storageUrl}/storage/v1/object/public/documents/${document.file_path}`;

  if (document.file_type === "application/pdf") {
    return (
      <div className="space-y-3">
        <iframe
          src={fileUrl}
          className="h-[600px] w-full rounded-lg border"
          title={document.file_name}
        />
      </div>
    );
  }

  // Word/Excel はダウンロードリンク + テキスト表示
  return (
    <div className="space-y-4">
      <a
        href={fileUrl}
        download={document.file_name}
        className="inline-flex items-center gap-2 text-sm text-primary underline"
      >
        {document.file_name} をダウンロード
      </a>
      {document.parsed_content && (
        <pre className="max-h-[500px] overflow-auto rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
          {document.parsed_content}
        </pre>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 詳細表示コンポーネントを作成**

```tsx
// src/app/(dashboard)/engineers/_components/engineer-detail.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { FilePreview } from "./file-preview";
import type { Engineer, Document } from "@/types";

interface EngineerDetailProps {
  engineer: Engineer;
  document: Document | null;
  storageUrl: string;
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
  expert: "エキスパート",
};

export function EngineerDetail({
  engineer,
  document,
  storageUrl,
}: EngineerDetailProps) {
  return (
    <Tabs defaultValue="structured">
      <TabsList>
        <TabsTrigger value="structured">構造化情報</TabsTrigger>
        <TabsTrigger value="raw">原文テキスト</TabsTrigger>
        <TabsTrigger value="preview">ファイルプレビュー</TabsTrigger>
      </TabsList>

      <TabsContent value="structured" className="space-y-4 pt-4">
        {/* スキル */}
        <Card>
          <CardHeader>
            <CardTitle>スキル</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {engineer.skills.map((skill) => (
                <Badge key={skill.name} variant="secondary">
                  {skill.name}（{LEVEL_LABELS[skill.level]}・{skill.years}年）
                </Badge>
              ))}
              {engineer.skills.length === 0 && (
                <p className="text-sm text-muted-foreground">未登録</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">経験年数</dt>
                <dd className="font-medium">{engineer.experience_years}年</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">メール</dt>
                <dd className="font-medium">{engineer.email ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">業界経験</dt>
                <dd className="font-medium">
                  {engineer.industries.join(", ") || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">リモート</dt>
                <dd className="font-medium">
                  {engineer.availability?.remote ? "可" : "不可"}
                </dd>
              </div>
              {engineer.availability?.rate_min && (
                <div>
                  <dt className="text-muted-foreground">単価</dt>
                  <dd className="font-medium">
                    {engineer.availability.rate_min?.toLocaleString()}〜
                    {engineer.availability.rate_max?.toLocaleString()}円
                  </dd>
                </div>
              )}
              {engineer.availability?.location && (
                <div>
                  <dt className="text-muted-foreground">勤務地</dt>
                  <dd className="font-medium">{engineer.availability.location}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* ソフトスキル */}
        {engineer.soft_skills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>ソフトスキル</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {engineer.soft_skills.map((ss) => (
                  <Badge key={ss.name} variant="outline">
                    {ss.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="raw" className="pt-4">
        <Card>
          <CardContent className="pt-6">
            {engineer.raw_text ? (
              <pre className="max-h-[600px] overflow-auto text-sm whitespace-pre-wrap">
                {engineer.raw_text}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">
                原文テキストがありません
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="preview" className="pt-4">
        <Card>
          <CardContent className="pt-6">
            <FilePreview document={document} storageUrl={storageUrl} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 3: 詳細ページを作成**

```tsx
// src/app/(dashboard)/engineers/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { EngineerDetail } from "../_components/engineer-detail";
import { deleteEngineer } from "@/actions/engineers";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EngineerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: engineer } = await supabase
    .from("engineers")
    .select("*")
    .eq("id", id)
    .single();

  if (!engineer) notFound();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("engineer_id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  const document = documents?.[0] ?? null;
  const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const deleteWithId = deleteEngineer.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href="/engineers" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{engineer.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href={`/engineers/${id}/edit`} />}>
            <Pencil className="mr-2 h-4 w-4" />
            編集
          </Button>
          <form action={deleteWithId}>
            <Button variant="destructive" type="submit">
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </Button>
          </form>
        </div>
      </div>

      <EngineerDetail
        engineer={engineer}
        document={document}
        storageUrl={storageUrl}
      />
    </div>
  );
}
```

- [ ] **Step 4: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 5: コミット**

```bash
git add src/app/\(dashboard\)/engineers/
git commit -m "feat: エンジニア詳細画面（構造化情報/原文/ファイルプレビュー）を追加"
```

---

### Task 10: エンジニア編集ページ

**Files:**
- Create: `src/app/(dashboard)/engineers/[id]/edit/page.tsx`

- [ ] **Step 1: 編集ページを作成**

```tsx
// src/app/(dashboard)/engineers/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EngineerForm } from "../../_components/engineer-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEngineerPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: engineer } = await supabase
    .from("engineers")
    .select("*")
    .eq("id", id)
    .single();

  if (!engineer) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{engineer.name} を編集</h1>
      <EngineerForm engineer={engineer} mode="edit" />
    </div>
  );
}
```

- [ ] **Step 2: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add src/app/\(dashboard\)/engineers/\[id\]/edit/
git commit -m "feat: エンジニア編集ページを追加"
```

---

### Task 11: Supabase Storage バケット作成 + 最終検証

**Files:**
- なし（Supabase ダッシュボード操作 + 検証）

- [ ] **Step 1: Supabase Storage に `documents` バケットを作成**

Supabase MCP または ダッシュボードで `documents` バケットを public で作成する。

- [ ] **Step 2: Biome check**

Run: `pnpm run check`
Expected: エラーなし

- [ ] **Step 3: 全テスト実行**

Run: `pnpm run test`
Expected: 全テスト PASS

- [ ] **Step 4: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功、以下のルートが表示される:
- `/engineers`
- `/engineers/new`
- `/engineers/[id]`
- `/engineers/[id]/edit`

- [ ] **Step 5: コミット + プッシュ**

```bash
git push
```

---

## 完了基準

- [ ] エンジニア一覧画面が表示される（検索・フィルタ・ソート）
- [ ] フォーム手入力でエンジニアを登録できる
- [ ] PDF/Word/Excel アップロードで Claude が構造化し、フォームにプリフィルされる
- [ ] エンジニア詳細画面で構造化情報・原文・ファイルプレビューが表示される
- [ ] エンジニアの編集・削除・再アップロードができる
- [ ] Embedding が生成され pgvector に保存される
- [ ] `pnpm run build` が通る
- [ ] `pnpm run test` が通る
- [ ] `pnpm run check` が通る
