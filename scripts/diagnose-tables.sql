-- Supabaseテーブル診断スクリプト
-- 重複したdesign_ideasテーブルを特定するためのクエリ

-- 1. すべてのdesign_ideas関連テーブルを検索
SELECT
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name LIKE '%design_ideas%'
ORDER BY table_schema, table_name;

-- 2. design_ideasテーブルのカラム構造を確認
SELECT
  table_schema,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'design_ideas'
ORDER BY table_schema, ordinal_position;

-- 3. publicスキーマのdesign_ideasテーブル詳細
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'design_ideas'
ORDER BY ordinal_position;
