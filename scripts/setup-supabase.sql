-- Supabase design_ideasテーブル作成スクリプト
-- AI生成デザインアイデアを保存するテーブル

CREATE TABLE IF NOT EXISTS design_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  theme TEXT NOT NULL,
  character TEXT NOT NULL,
  phrase TEXT NOT NULL,
  font_style TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL
);

-- インデックスを作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_design_ideas_created_at ON design_ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_design_ideas_phrase ON design_ideas(phrase);
CREATE INDEX IF NOT EXISTS idx_design_ideas_product_type ON design_ideas(product_type);

-- Row Level Security (RLS) を有効化
ALTER TABLE design_ideas ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（エラー回避）
DROP POLICY IF EXISTS "Enable read access for all users" ON design_ideas;
DROP POLICY IF EXISTS "Enable insert access for all users" ON design_ideas;

-- 誰でも読み取り可能
CREATE POLICY "Enable read access for all users" ON design_ideas
  FOR SELECT
  USING (true);

-- 誰でも挿入可能
CREATE POLICY "Enable insert access for all users" ON design_ideas
  FOR INSERT
  WITH CHECK (true);

-- 確認
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'design_ideas'
ORDER BY ordinal_position;
