# サインアップフロー修正 + 関連バグ修正

## 背景

エンジニア登録画面でスキルシートをアップロードすると「認証が必要です」エラーが発生する。
調査の結果、以下の連鎖的な問題が判明した。

### 根本原因

`signup` アクションが `auth.users` にレコードを作成するのみで、`public.organizations` / `public.users` にレコードを作成していない。DB トリガーも存在しない。

### 影響範囲

1. `get_user_org_id()` が常に NULL を返す → 全テーブルの RLS ポリシーが機能しない
2. `uploadFile` の `supabase.from("users").select("org_id")` が空結果を返す
3. Storage の RLS ポリシーが未設定 → 認証が通ってもアップロード不可
4. Server Actions の body size 制限がデフォルト 1MB → 10MB ファイルに非対応

## 設計方針

ハイブリッド方式（セルフサインアップ + 将来の招待機能）を採用。今回はセルフサインアップ部分のみ実装。

## 変更内容

### 1. サインアップフォーム変更

**対象ファイル**: `src/app/(auth)/signup/page.tsx`

- 組織名フィールドを追加（必須、name="orgName"）
- バリデーション: 空文字不可

### 2. `signup` アクション修正

**対象ファイル**: `src/actions/auth.ts`

- `supabase.auth.signUp()` の `options.data` に `org_name` を含める
- `org_name` は `formData.get("orgName")` から取得

```ts
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      name,
      org_name: orgName,
    },
  },
})
```

### 3. DB トリガー: `on_auth_user_created`

**種別**: Supabase マイグレーション

`SECURITY DEFINER` 関数で RLS をバイパスし、`auth.users` への INSERT 時に自動実行。

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- 組織を作成
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(new.raw_user_meta_data->>'org_name', 'マイ組織'))
  RETURNING id INTO new_org_id;

  -- ユーザープロフィールを作成
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
```

- 最初にサインアップしたユーザーは自動的に `admin` ロール
- 組織名は `raw_user_meta_data->>'org_name'` から取得（フォールバック: 'マイ組織'）
- `search_path = ''` でセキュリティを確保

### 4. Storage RLS ポリシー追加

**種別**: Supabase マイグレーション

`documents` バケットの `storage.objects` に対するポリシー:

```sql
-- SELECT: 自組織のファイルのみ参照可能
CREATE POLICY "自組織のドキュメントのみ参照可能"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (SELECT get_user_org_id()::text)
);

-- INSERT: 自組織パスにのみアップロード可能
CREATE POLICY "自組織にドキュメントをアップロード可能"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (SELECT get_user_org_id()::text)
);

-- DELETE: 自組織のファイルのみ削除可能
CREATE POLICY "自組織のドキュメントを削除可能"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (SELECT get_user_org_id()::text)
);
```

ファイルパスの形式: `{org_id}/{uuid}/{filename}` （既存の `uploadFile` と一致）

### 5. Server Actions body size 拡張

**対象ファイル**: `next.config.ts`

```ts
const nextConfig: NextConfig = {
  serverActions: {
    bodySizeLimit: "12mb",
  },
}
```

12MB に設定（10MB ファイル + FormData オーバーヘッド）。

### 6. 既存データのクリーンアップ

**種別**: Supabase マイグレーション

```sql
DELETE FROM auth.users;
```

開発環境のみ。既存ユーザーは未確認・データなしのため削除してやり直し。

## スコープ外（将来フェーズ）

- 招待リンクによるメンバー追加（C 方式の完成）
- メール確認フロー
- 組織設定画面

## テスト方針

- トリガー関数の単体テスト（SQL）
- `signup` アクションの統合テスト
- ファイルアップロードフローの E2E 確認（手動）
