-- 処理済み商品記録テーブル
-- 価格更新やエキスプレス設定の重複を防ぐ

CREATE TABLE IF NOT EXISTS processed_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- 商品情報
  product_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  product_title TEXT,

  -- 処理タイプ（price_update, express_shipping など）
  process_type TEXT NOT NULL,

  -- 処理詳細（JSON形式で柔軟に保存）
  metadata JSONB,

  -- ユニーク制約：同じ商品+処理タイプは1回のみ
  CONSTRAINT unique_product_process UNIQUE (product_id, shop_id, process_type)
);

-- インデックス作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_processed_products_product_id ON processed_products(product_id);
CREATE INDEX IF NOT EXISTS idx_processed_products_process_type ON processed_products(process_type);
CREATE INDEX IF NOT EXISTS idx_processed_products_created_at ON processed_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processed_products_shop_process ON processed_products(shop_id, process_type);

-- Row Level Security (RLS) を有効化
ALTER TABLE processed_products ENABLE ROW LEVEL SECURITY;

-- ポリシー削除（エラー回避）
DROP POLICY IF EXISTS "Enable read access for all users" ON processed_products;
DROP POLICY IF EXISTS "Enable insert access for all users" ON processed_products;
DROP POLICY IF EXISTS "Enable delete access for all users" ON processed_products;

-- 誰でも読み取り可能
CREATE POLICY "Enable read access for all users" ON processed_products
  FOR SELECT
  USING (true);

-- 誰でも挿入可能（UPSERT対応）
CREATE POLICY "Enable insert access for all users" ON processed_products
  FOR INSERT
  WITH CHECK (true);

-- 誰でも削除可能（履歴リセット用）
CREATE POLICY "Enable delete access for all users" ON processed_products
  FOR DELETE
  USING (true);

-- 確認: テーブル構造を表示
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'processed_products'
ORDER BY ordinal_position;

-- 初期データ確認
SELECT COUNT(*) as total_processed FROM processed_products;
