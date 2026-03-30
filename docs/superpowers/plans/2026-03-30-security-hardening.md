# セキュリティ強化 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Server Actions・API Route に org_id 認可チェックを追加し、セキュリティヘッダーを設定する

**Architecture:** 全 update/delete 操作でユーザーの org_id を取得し、クエリに `.eq("org_id", profile.org_id)` を追加する防御の多層化。next.config.ts にセキュリティヘッダーを追加。

**Tech Stack:** Next.js 16, Supabase, TypeScript

---

### Task 1: engineers.ts — org_id 認可チェック追加

**Files:**
- Modify: `src/actions/engineers.ts:102-170` (updateEngineer), `src/actions/engineers.ts:172-191` (deleteEngineer)

- [ ] **Step 1: updateEngineer に profile 取得と org_id チェックを追加**

`updateEngineer` で profile を先頭で取得し、update クエリに `.eq("org_id", profile.org_id)` を追加。
また、ドキュメント更新部分で profile を再取得している冗長なコードも整理する。

- [ ] **Step 2: deleteEngineer に profile 取得と org_id チェックを追加**

`deleteEngineer` で profile を取得し、delete クエリと documents クエリに org_id チェックを追加。

---

### Task 2: projects.ts — org_id 認可チェック追加

**Files:**
- Modify: `src/actions/projects.ts:53-95` (updateProject), `src/actions/projects.ts:97-109` (deleteProject), `src/actions/projects.ts:111-130` (toggleProjectStatus)

- [ ] **Step 1: updateProject に org_id チェック追加**
- [ ] **Step 2: deleteProject に org_id チェック追加**
- [ ] **Step 3: toggleProjectStatus に org_id チェック追加**

---

### Task 3: proposals.ts — org_id 認可チェック追加

**Files:**
- Modify: `src/actions/proposals.ts:34-48` (updateProposal), `src/actions/proposals.ts:50-62` (deleteProposal)

- [ ] **Step 1: updateProposal に org_id チェック追加**
- [ ] **Step 2: deleteProposal に org_id チェック追加**

---

### Task 4: API Route — org_id 認可チェック追加

**Files:**
- Modify: `src/app/api/proposals/generate/route.ts`

- [ ] **Step 1: match 取得クエリにユーザーの org_id チェックを追加**

---

### Task 5: セキュリティヘッダー追加

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: next.config.ts に headers() を追加**

ヘッダー: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, X-DNS-Prefetch-Control, Permissions-Policy

---

### Task 6: ビルド検証

- [ ] **Step 1: `pnpm run check` 実行**
- [ ] **Step 2: `pnpm run build` 実行**
