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
