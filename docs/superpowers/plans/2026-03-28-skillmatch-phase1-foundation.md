# SkillMatch Phase 1: 基盤セットアップ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Supabase（DB + Auth + RLS）、AI SDK プロバイダー、認証フロー、ダッシュボードレイアウトを構築し、Phase 2 以降の基盤を完成させる。

**Architecture:** Next.js 16 単体構成。Supabase をインフラ（DB/Auth/Storage）として使い、proxy.ts で認証チェックを行う。AI SDK の Provider Registry で Claude/OpenAI を統一管理する。

**Tech Stack:** Next.js 16, Supabase (@supabase/ssr), Vercel AI SDK 6 (@ai-sdk/anthropic, @ai-sdk/openai), shadcn/ui, Tailwind CSS 4, Zod

---

## ファイル構成

```

├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx              ← 認証画面用レイアウト（センター配置）
│   │   │   ├── login/page.tsx          ← ログイン画面
│   │   │   └── signup/page.tsx         ← サインアップ画面
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              ← ダッシュボード用レイアウト（サイドバー付き）
│   │   │   └── dashboard/page.tsx      ← ダッシュボードページ（プレースホルダー）
│   │   ├── layout.tsx                  ← ルートレイアウト（既存を修正）
│   │   └── page.tsx                    ← / → /dashboard へリダイレクト
│   ├── actions/
│   │   └── auth.ts                     ← ログイン/サインアップ Server Actions
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts               ← サーバーサイド用クライアント
│   │   │   ├── client.ts               ← クライアントサイド用クライアント
│   │   │   └── proxy.ts                ← proxy.ts 用のセッション更新ヘルパー
│   │   ├── ai/
│   │   │   └── provider.ts             ← Provider Registry（Claude + OpenAI）
│   │   └── utils.ts                    ← 既存（shadcn/ui の cn()）
│   ├── components/
│   │   ├── ui/                         ← shadcn/ui（既存の button + 追加コンポーネント）
│   │   └── layout/
│   │       ├── sidebar.tsx             ← サイドバー
│   │       └── header.tsx              ← ヘッダー（ユーザーメニュー）
│   └── types/
│       └── index.ts                    ← 共通型定義
├── proxy.ts                            ← 認証プロキシ（Next.js 16）
├── .env.local                          ← 環境変数
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql      ← 初期スキーマ（全テーブル + RLS）
```

---

### Task 1: 依存パッケージのインストール

**Files:**

- Modify: `package.json`

- [x] **Step 1: Supabase 関連パッケージをインストール**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

- [x] **Step 2: AI SDK プロバイダーパッケージをインストール**

```bash
pnpm add @ai-sdk/anthropic @ai-sdk/openai
```

- [x] **Step 3: Zod をインストール（構造化出力のスキーマ定義用）**

```bash
pnpm add zod
```

- [x] **Step 4: ビルド確認**

Run: `cd /Users/kaneda/projects/temp-react-app && pnpm run build`
Expected: ビルド成功

- [x] **Step 5: コミット**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: Supabase, AI SDK, Zod の依存パッケージを追加"
```

---

### Task 2: 環境変数と型定義

**Files:**

- Create: `.env.local`
- Create: `src/types/index.ts`

- [x] **Step 1: 環境変数ファイルを作成**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
```

- [x] **Step 2: .gitignore に .env.local が含まれていることを確認**

Run: `grep '.env.local' .gitignore`
Expected: `.env*.local` が含まれている

- [x] **Step 3: 共通型定義ファイルを作成**

```ts
// src/types/index.ts

export type UserRole = "admin" | "member";
export type ProjectStatus = "open" | "closed";

export interface Organization {
  id: string;
  name: string;
  plan: string | null;
  created_at: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface Engineer {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  skills: Skill[];
  experience_years: number;
  industries: string[];
  availability: Availability;
  soft_skills: SoftSkill[];
  raw_text: string;
  embedding: number[] | null;
  created_at: string;
}

export interface Skill {
  name: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  years: number;
}

export interface Availability {
  rate_min: number | null;
  rate_max: number | null;
  start_date: string | null;
  remote: boolean;
  location: string | null;
}

export interface SoftSkill {
  name: string;
  description: string | null;
}

export interface Project {
  id: string;
  org_id: string;
  title: string;
  client_name: string;
  required_skills: Skill[];
  experience_years: number;
  industries: string[];
  conditions: Availability;
  description: string;
  embedding: number[] | null;
  status: ProjectStatus;
  created_at: string;
}

export interface Match {
  id: string;
  org_id: string;
  project_id: string;
  engineer_id: string;
  overall_score: number;
  skill_score: number;
  experience_score: number;
  industry_score: number;
  condition_score: number;
  soft_skill_score: number;
  ai_reasoning: string;
  created_at: string;
}

export interface Document {
  id: string;
  org_id: string;
  engineer_id: string | null;
  project_id: string | null;
  file_name: string;
  file_path: string;
  file_type: string;
  parsed_content: string | null;
  created_at: string;
}

export interface Proposal {
  id: string;
  org_id: string;
  match_id: string;
  content: string;
  format: string;
  created_at: string;
}
```

- [x] **Step 4: コミット**

```bash
git add src/types/index.ts .env.local
git commit -m "feat: 環境変数テンプレートと共通型定義を追加"
```

---

### Task 3: Supabase クライアント設定

**Files:**

- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/proxy.ts`

- [x] **Step 1: クライアントサイド用 Supabase クライアントを作成**

```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
```

- [x] **Step 2: サーバーサイド用 Supabase クライアントを作成**

```ts
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component からの呼び出し時は書き込み不可 — proxy が更新する
          }
        },
      },
    },
  );
}
```

- [x] **Step 3: proxy.ts 用のセッション更新ヘルパーを作成**

```ts
// src/lib/supabase/proxy.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/signup")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

- [x] **Step 4: ビルド確認**

Run: `cd /Users/kaneda/projects/temp-react-app && pnpm run build`
Expected: ビルド成功

- [x] **Step 5: コミット**

```bash
git add src/lib/supabase/
git commit -m "feat: Supabase クライアント（ブラウザ/サーバー/proxy）を追加"
```

---

### Task 4: 認証プロキシ（proxy.ts）

**Files:**

- Create: `proxy.ts`

- [x] **Step 1: proxy.ts を作成（Next.js 16 の認証チェック）**

```ts
// proxy.ts
import { updateSession } from "@/lib/supabase/proxy";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [x] **Step 2: ビルド確認**

Run: `cd /Users/kaneda/projects/temp-react-app && pnpm run build`
Expected: ビルド成功

- [x] **Step 3: コミット**

```bash
git add proxy.ts
git commit -m "feat: 認証プロキシ（proxy.ts）を追加"
```

---

### Task 5: AI SDK Provider Registry

**Files:**

- Create: `src/lib/ai/provider.ts`

- [x] **Step 1: Provider Registry を作成**

```ts
// src/lib/ai/provider.ts
import { createProviderRegistry } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

export const registry = createProviderRegistry({
  anthropic: createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
  openai: createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }),
});

// 言語モデル（構造化・評価・生成）
export const llm = registry.languageModel("anthropic:claude-sonnet-4-6");

// 埋め込みモデル
export const embeddingModel = registry.embeddingModel(
  "openai:text-embedding-3-small",
);
```

- [x] **Step 2: ビルド確認**

Run: `cd /Users/kaneda/projects/temp-react-app && pnpm run build`
Expected: ビルド成功

- [x] **Step 3: コミット**

```bash
git add src/lib/ai/provider.ts
git commit -m "feat: AI SDK Provider Registry（Claude + OpenAI）を追加"
```

---

### Task 6: shadcn/ui コンポーネント追加

**Files:**

- Create: 各種 shadcn/ui コンポーネント

- [x] **Step 1: 認証・レイアウトに必要なコンポーネントを追加**

```bash
pnpm dlx shadcn@latest add input label card separator avatar dropdown-menu sheet
```

- [x] **Step 2: ビルド確認**

Run: `cd /Users/kaneda/projects/temp-react-app && pnpm run build`
Expected: ビルド成功

- [x] **Step 3: コミット**

```bash
git add src/components/ui/
git commit -m "feat: shadcn/ui コンポーネント（input, label, card, separator, avatar, dropdown-menu, sheet）を追加"
```

---

### Task 7: 認証画面（ログイン・サインアップ）

**Files:**

- Create: `src/actions/auth.ts`
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/signup/page.tsx`

- [x] **Step 1: 認証 Server Actions を作成**

```ts
// src/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: {
        name: formData.get("name") as string,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [x] **Step 2: 認証画面用レイアウトを作成**

```tsx
// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">{children}</div>
    </div>
  );
}
```

- [x] **Step 3: ログイン画面を作成**

```tsx
// src/app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">SkillMatch</CardTitle>
        <CardDescription>アカウントにログイン</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" className="text-primary underline">
            サインアップ
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
```

- [x] **Step 4: サインアップ画面を作成**

```tsx
// src/app/(auth)/signup/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { signup } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await signup(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">SkillMatch</CardTitle>
        <CardDescription>新規アカウント作成</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">名前</Label>
            <Input id="name" name="name" type="text" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "作成中..." : "アカウント作成"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          既にアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-primary underline">
            ログイン
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
```

- [x] **Step 5: ビルド確認**

Run: `cd /Users/kaneda/projects/temp-react-app && pnpm run build`
Expected: ビルド成功

- [x] **Step 6: コミット**

```bash
git add src/actions/auth.ts src/app/\(auth\)/
git commit -m "feat: 認証画面（ログイン・サインアップ）と認証 Server Actions を追加"
```

---

### Task 8: ダッシュボードレイアウト（サイドバー + ヘッダー）

**Files:**

- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/header.tsx`
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/dashboard/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

- [x] **Step 1: サイドバーコンポーネントを作成**

```tsx
// src/components/layout/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Target,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/engineers", label: "エンジニア", icon: Users },
  { href: "/projects", label: "案件", icon: Briefcase },
  { href: "/matching", label: "マッチング", icon: Target },
  { href: "/proposals", label: "提案書", icon: FileText },
];

const bottomItems = [{ href: "/settings", label: "設定", icon: Settings }];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-muted/30">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/dashboard" className="text-lg font-bold text-primary">
          SkillMatch
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t px-3 py-4">
        {bottomItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
```

- [x] **Step 2: ヘッダーコンポーネントを作成**

```tsx
// src/components/layout/header.tsx
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = user?.user_metadata?.name ?? user?.email ?? "";
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-14 items-center justify-end border-b px-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
            {user?.email}
          </DropdownMenuItem>
          <form action={logout}>
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                ログアウト
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
```

- [x] **Step 3: ダッシュボードレイアウトを作成**

```tsx
// src/app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [x] **Step 4: ダッシュボードページ（プレースホルダー）を作成**

```tsx
// src/app/(dashboard)/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">ダッシュボード</h1>
      <p className="mt-2 text-muted-foreground">
        SkillMatch へようこそ。Phase 2 以降で統計情報を表示します。
      </p>
    </div>
  );
}
```

- [x] **Step 5: ルートページを /dashboard へリダイレクトに変更**

```tsx
// src/app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

- [x] **Step 6: ルートレイアウトを更新（lang="ja" に変更、メタデータ更新）**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillMatch",
  description: "AIマッチングツール — エンジニアと案件を最適にマッチング",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [x] **Step 7: ビルド確認**

Run: `cd /Users/kaneda/projects/temp-react-app && pnpm run build`
Expected: ビルド成功

- [x] **Step 8: コミット**

```bash
git add src/components/layout/ src/app/
git commit -m "feat: ダッシュボードレイアウト（サイドバー + ヘッダー）を追加"
```

---

### Task 9: Supabase データベーススキーマ（マイグレーション SQL）

**Files:**

- Create: `supabase/migrations/001_initial_schema.sql`

- [x] **Step 1: 初期スキーマのマイグレーション SQL を作成**

```sql
-- supabase/migrations/001_initial_schema.sql

-- pgvector 拡張を有効化
create extension if not exists vector with schema extensions;

-- organizations テーブル
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text,
  created_at timestamptz not null default now()
);

-- users テーブル
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

-- engineers テーブル
create table public.engineers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  skills jsonb not null default '[]'::jsonb,
  experience_years int not null default 0,
  industries text[] not null default '{}',
  availability jsonb not null default '{}'::jsonb,
  soft_skills jsonb not null default '[]'::jsonb,
  raw_text text not null default '',
  embedding extensions.vector(1536),
  created_at timestamptz not null default now()
);

-- projects テーブル
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  client_name text not null,
  required_skills jsonb not null default '[]'::jsonb,
  experience_years int not null default 0,
  industries text[] not null default '{}',
  conditions jsonb not null default '{}'::jsonb,
  description text not null default '',
  embedding extensions.vector(1536),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

-- matches テーブル
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  engineer_id uuid not null references public.engineers(id) on delete cascade,
  overall_score float not null default 0,
  skill_score float not null default 0,
  experience_score float not null default 0,
  industry_score float not null default 0,
  condition_score float not null default 0,
  soft_skill_score float not null default 0,
  ai_reasoning text not null default '',
  created_at timestamptz not null default now()
);

-- documents テーブル
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engineer_id uuid references public.engineers(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  parsed_content text,
  created_at timestamptz not null default now()
);

-- proposals テーブル
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  content text not null,
  format text not null default 'markdown',
  created_at timestamptz not null default now()
);

-- ベクトル検索用インデックス
create index engineers_embedding_idx on public.engineers
  using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 100);

create index projects_embedding_idx on public.projects
  using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 100);

-- RLS を有効化
alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.engineers enable row level security;
alter table public.projects enable row level security;
alter table public.matches enable row level security;
alter table public.documents enable row level security;
alter table public.proposals enable row level security;

-- ユーザーの org_id を取得するヘルパー関数
create or replace function public.get_user_org_id()
returns uuid
language sql
stable
security definer
as $$
  select org_id from public.users where id = auth.uid()
$$;

-- RLS ポリシー: organizations
create policy "ユーザーは自分の組織のみ参照可能"
  on public.organizations for select
  using (id = public.get_user_org_id());

-- RLS ポリシー: users
create policy "ユーザーは自組織のメンバーのみ参照可能"
  on public.users for select
  using (org_id = public.get_user_org_id());

create policy "管理者は自組織にメンバーを追加可能"
  on public.users for insert
  with check (
    org_id = public.get_user_org_id()
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS ポリシー: engineers
create policy "自組織のエンジニアのみ参照可能"
  on public.engineers for select
  using (org_id = public.get_user_org_id());

create policy "自組織にエンジニアを追加可能"
  on public.engineers for insert
  with check (org_id = public.get_user_org_id());

create policy "自組織のエンジニアを更新可能"
  on public.engineers for update
  using (org_id = public.get_user_org_id());

create policy "自組織のエンジニアを削除可能"
  on public.engineers for delete
  using (org_id = public.get_user_org_id());

-- RLS ポリシー: projects
create policy "自組織の案件のみ参照可能"
  on public.projects for select
  using (org_id = public.get_user_org_id());

create policy "自組織に案件を追加可能"
  on public.projects for insert
  with check (org_id = public.get_user_org_id());

create policy "自組織の案件を更新可能"
  on public.projects for update
  using (org_id = public.get_user_org_id());

create policy "自組織の案件を削除可能"
  on public.projects for delete
  using (org_id = public.get_user_org_id());

-- RLS ポリシー: matches
create policy "自組織のマッチ結果のみ参照可能"
  on public.matches for select
  using (org_id = public.get_user_org_id());

create policy "自組織にマッチ結果を追加可能"
  on public.matches for insert
  with check (org_id = public.get_user_org_id());

-- RLS ポリシー: documents
create policy "自組織のドキュメントのみ参照可能"
  on public.documents for select
  using (org_id = public.get_user_org_id());

create policy "自組織にドキュメントを追加可能"
  on public.documents for insert
  with check (org_id = public.get_user_org_id());

create policy "自組織のドキュメントを削除可能"
  on public.documents for delete
  using (org_id = public.get_user_org_id());

-- RLS ポリシー: proposals
create policy "自組織の提案書のみ参照可能"
  on public.proposals for select
  using (org_id = public.get_user_org_id());

create policy "自組織に提案書を追加可能"
  on public.proposals for insert
  with check (org_id = public.get_user_org_id());

create policy "自組織の提案書を更新可能"
  on public.proposals for update
  using (org_id = public.get_user_org_id());

create policy "自組織の提案書を削除可能"
  on public.proposals for delete
  using (org_id = public.get_user_org_id());
```

- [x] **Step 2: コミット**

```bash
git add supabase/
git commit -m "feat: Supabase 初期スキーマ（全テーブル + RLS + pgvector インデックス）を追加"
```

> **Note:** このSQLは Supabase ダッシュボードの SQL Editor で実行するか、`supabase db push` で適用する。Supabase CLI のセットアップは別途必要。

---

## 完了基準

- [x] Supabase クライアント（ブラウザ/サーバー/proxy）が設定済み
- [x] proxy.ts で未認証ユーザーが /login にリダイレクトされる
- [x] AI SDK Provider Registry（Claude + OpenAI）が設定済み
- [x] ログイン・サインアップ画面が表示される
- [x] ダッシュボードレイアウト（サイドバー + ヘッダー）が表示される
- [x] DB スキーマ（全7テーブル + RLS）のマイグレーション SQL が用意されている
- [x] `pnpm run build` が通る
