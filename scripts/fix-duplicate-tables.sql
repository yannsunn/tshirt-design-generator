-- 重複テーブル削除と再作成スクリプト
-- すべてのdesign_ideasテーブルを削除してクリーンな状態から作成

-- 1. 既存のポリシーを削除
DROP POLICY IF EXISTS "Enable read access for all users" ON design_ideas;
DROP POLICY IF EXISTS "Enable insert access for all users" ON design_ideas;

-- 2. 既存のインデックスを削除
DROP INDEX IF EXISTS idx_design_ideas_created_at;
DROP INDEX IF EXISTS idx_design_ideas_phrase;
DROP INDEX IF EXISTS idx_design_ideas_product_type;

-- 3. テーブルを完全に削除（CASCADE で依存関係も削除）
DROP TABLE IF EXISTS design_ideas CASCADE;

-- 4. テーブルを新規作成（正しい構造）
CREATE TABLE design_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  theme TEXT NOT NULL,
  character TEXT NOT NULL,
  phrase TEXT NOT NULL,
  font_style TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL
);

-- 5. インデックスを作成
CREATE INDEX idx_design_ideas_created_at ON design_ideas(created_at DESC);
CREATE INDEX idx_design_ideas_phrase ON design_ideas(phrase);
CREATE INDEX idx_design_ideas_product_type ON design_ideas(product_type);

-- 6. Row Level Security (RLS) を有効化
ALTER TABLE design_ideas ENABLE ROW LEVEL SECURITY;

-- 7. ポリシーを作成
CREATE POLICY "Enable read access for all users" ON design_ideas
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert access for all users" ON design_ideas
  FOR INSERT
  WITH CHECK (true);

-- 8. 確認: テーブル構造を表示
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'design_ideas'
ORDER BY ordinal_position;
