-- matches テーブルに DELETE / UPDATE の RLS ポリシーを追加
CREATE POLICY "自組織のマッチ結果を削除可能"
  ON public.matches FOR DELETE
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "自組織のマッチ結果を更新可能"
  ON public.matches FOR UPDATE
  USING (org_id = (SELECT get_user_org_id()));
