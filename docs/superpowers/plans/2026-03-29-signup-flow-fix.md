# サインアップフロー修正 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** サインアップ時に組織+ユーザープロフィールを自動作成し、スキルシートアップロードのエラーを修正する

**Architecture:** DBトリガーで `auth.users` INSERT 時に `organizations` + `users` レコードを自動作成。サインアップフォームに組織名フィールドを追加。Storage RLS ポリシーと body size 制限も修正。

**Tech Stack:** Supabase (PostgreSQL triggers, RLS), Next.js 16 (Server Actions, App Router), React 19, shadcn/ui

---

## ファイル構成

| 操作 | パス | 責務 |
|------|------|------|
| 作成 | `supabase/migrations/003_signup_trigger.sql` | DBトリガー + Storage RLS + 既存ユーザー削除 |
| 変更 | `src/actions/auth.ts` | signup に org_name を追加 |
| 変更 | `src/app/(auth)/signup/page.tsx` | 組織名フィールドを追加 |
| 変更 | `src/app/(auth)/signup/page.test.tsx` | 組織名フィールドのテスト追加 |
| 変更 | `next.config.ts` | serverActions.bodySizeLimit を 12mb に |

---

### Task 1: DBマイグレーション（トリガー + Storage RLS + クリーンアップ）

**Files:**
- Create: `supabase/migrations/003_signup_trigger.sql`

- [ ] **Step 1: マイグレーションファイルを作成**

```sql
-- 既存の未設定ユーザーを削除（開発環境クリーンアップ）
DELETE FROM auth.users;

-- サインアップ時に組織 + ユーザープロフィールを自動作成するトリガー関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(new.raw_user_meta_data->>'org_name', 'マイ組織'))
  RETURNING id INTO new_org_id;

  INSERT INTO public.users (id, org_id, email, name, role)
  VALUES (
    new.id,
    new_org_id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', ''),
    'admin'
  );

  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Storage RLS ポリシー（documents バケット）
CREATE POLICY "自組織のドキュメントのみ参照可能"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (SELECT public.get_user_org_id()::text)
);

CREATE POLICY "自組織にドキュメントをアップロード可能"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (SELECT public.get_user_org_id()::text)
);

CREATE POLICY "自組織のドキュメントを削除可能"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (SELECT public.get_user_org_id()::text)
);
```

- [ ] **Step 2: Supabase ダッシュボードまたは MCP でマイグレーションを実行**

SQL Editor で上記を実行し、成功を確認する。

- [ ] **Step 3: コミット**

```bash
git add supabase/migrations/003_signup_trigger.sql
git commit -m "feat: サインアップトリガー + Storage RLS ポリシーを追加"
```

---

### Task 2: Server Actions body size 拡張

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: next.config.ts を変更**

```ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverActions: {
    bodySizeLimit: "12mb",
  },
}

export default nextConfig
```

- [ ] **Step 2: コミット**

```bash
git add next.config.ts
git commit -m "fix: Server Actions の body size 制限を 12mb に拡張"
```

---

### Task 3: signup アクションに org_name を追加

**Files:**
- Modify: `src/actions/auth.ts`

- [ ] **Step 1: signup アクションを修正**

`src/actions/auth.ts` の `signup` 関数を以下に変更:

```ts
export async function signup(formData: FormData) {
  const supabase = await createClient()

  const orgName = formData.get("orgName") as string
  if (!orgName?.trim()) {
    return { error: "組織名を入力してください" }
  }

  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: {
        name: formData.get("name") as string,
        org_name: orgName.trim(),
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect("/dashboard")
}
```

- [ ] **Step 2: コミット**

```bash
git add src/actions/auth.ts
git commit -m "feat: signup アクションに org_name を追加"
```

---

### Task 4: サインアップフォームに組織名フィールドを追加

**Files:**
- Modify: `src/app/(auth)/signup/page.tsx`
- Modify: `src/app/(auth)/signup/page.test.tsx`

- [ ] **Step 1: テストに組織名フィールドのテストを追加**

`src/app/(auth)/signup/page.test.tsx` に以下のテストを追加:

```tsx
it("組織名の入力フィールドが表示される", () => {
  render(<SignupPage />)
  expect(screen.getByLabelText("組織名")).toBeInTheDocument()
  expect(screen.getByLabelText("組織名")).toBeRequired()
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `pnpm run test -- src/app/\(auth\)/signup/page.test.tsx`
Expected: FAIL — "組織名" ラベルが見つからない

- [ ] **Step 3: サインアップフォームに組織名フィールドを追加**

`src/app/(auth)/signup/page.tsx` の `<form>` 内、名前フィールドの前に追加:

```tsx
<div className="space-y-2">
  <Label htmlFor="orgName">組織名</Label>
  <Input id="orgName" name="orgName" type="text" required placeholder="株式会社〇〇" />
</div>
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `pnpm run test -- src/app/\(auth\)/signup/page.test.tsx`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/app/\(auth\)/signup/page.tsx src/app/\(auth\)/signup/page.test.tsx
git commit -m "feat: サインアップフォームに組織名フィールドを追加"
```

---

### Task 5: ビルド検証 + lint

**Files:** なし（検証のみ）

- [ ] **Step 1: lint + format を実行**

Run: `pnpm run check`
Expected: エラーなし（自動修正が適用される）

- [ ] **Step 2: 変更があればコミット**

```bash
git add -A
git commit -m "style: lint + format 適用"
```

- [ ] **Step 3: ビルドを実行**

Run: `pnpm run build`
Expected: ビルド成功

- [ ] **Step 4: 全テストを実行**

Run: `pnpm run test`
Expected: 全テスト PASS
