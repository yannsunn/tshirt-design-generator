# 価格管理システム ドキュメント

## 概要

全506商品（Storefront、Etsy、eBay）の価格を最適化し、38%マージンを維持するシステムです。

## システム構成

### API エンドポイント

#### 1. 単一商品更新
```bash
curl -X POST https://design-generator-puce.vercel.app/api/printify-update-single-product \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "24566516",
    "productId": "68de83ee8c549343ea009d82",
    "targetMargin": 38
  }'
```

#### 2. バッチ更新
```bash
curl -X POST https://design-generator-puce.vercel.app/api/batch-update-products \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {"shopId": "24566516", "productId": "abc123"},
      {"shopId": "24566474", "productId": "def456"}
    ],
    "targetMargin": 38
  }'
```

#### 3. 全ショップ一括更新
```bash
curl -X POST https://design-generator-puce.vercel.app/api/update-all-shops-prices \
  -H "Content-Type: application/json" \
  -d '{
    "targetMargin": 38,
    "offset": 0,
    "limit": 8
  }'
```

#### 4. タイトル・説明文更新
```bash
curl -X POST https://design-generator-puce.vercel.app/api/printify-update-product-title \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "24566516",
    "productId": "68de83ee8c549343ea009d82",
    "newTitle": "Cute Halloween Tee",
    "newDescription": "Perfect for Halloween season!"
  }'
```

### ローカルスクリプト

#### 自動価格チェック（分析のみ）
```bash
node scripts/auto-pricing-check.js --analyze
```

#### 自動修正
```bash
node scripts/auto-pricing-check.js --auto-fix
```

### GitHub Actions（自動化）

毎日午前9時（UTC）に自動実行:
- 全商品の価格分析
- レポート生成
- 問題商品の検出

手動実行:
```bash
gh workflow run pricing-check.yml -f auto_fix=true
```

## ログシステム

### Vercel環境
- コンソールログのみ（Vercelダッシュボードで確認可能）
- APIレスポンスにログエントリを含む

### ローカル/GitHub Actions環境
- `pricing-reports/error-log.json` - エラーログ
- `pricing-reports/pricing-change-log.json` - 価格変更履歴
- `pricing-reports/batch-update-*.json` - バッチ更新レポート

### ログ形式

#### 価格変更ログ
```json
{
  "timestamp": "2025-10-06T12:34:56.789Z",
  "type": "price_change",
  "productId": "abc123",
  "shopId": "24566516",
  "changes": {
    "oldPrice": 1999,
    "newPrice": 2699,
    "blueprint": 12,
    "margin": 38,
    "reason": "batch_update"
  }
}
```

#### エラーログ
```json
{
  "timestamp": "2025-10-06T12:34:56.789Z",
  "type": "error",
  "context": "printify-update-single-product",
  "error": {
    "message": "Failed to fetch product",
    "stack": "...",
    "name": "Error"
  },
  "shopId": "24566516",
  "productId": "abc123"
}
```

## Blueprint 原価データ

| Blueprint ID | 商品名 | 基本原価 | 2XL | 3XL | 4XL | 5XL |
|--------------|--------|----------|-----|-----|-----|-----|
| 706 | Custom T-Shirt (Master) | $12.41 | $13.67 | $15.71 | $17.66 | - |
| 1296 | Custom Sweatshirt (Master) | $30.64 | $35.48 | $41.81 | - | - |
| 6 | Gildan 5000 T-Shirt | $11.67 | $15.44 | $16.36 | $16.36 | $16.36 |
| 49 | Gildan 18000 Sweatshirt | $22.30 | - | - | - | - |
| 12 | Next Level 6210 Tri-Blend | $16.36 | $20.39 | - | - | - |

## 価格計算式

```
最適価格 = ceil(原価 / (1 - マージン率)) - 0.01
```

例: 原価$12.41、マージン38%の場合
```
$12.41 / (1 - 0.38) = $20.016
ceil($20.016) = $21
$21 - 0.01 = $20.99
```

## トラブルシューティング

### タイトルが長すぎるエラー
```
Error Code: 31904 - Title is too long
```

**解決方法:**
1. タイトル更新APIで80文字以下に短縮
2. 必要に応じて説明文も1000文字以下に短縮
3. その後、価格更新APIを実行

### レート制限エラー
```
Error Code: 429 - Too Many Requests
```

**解決方法:**
- バッチ更新時は`limit`を減らす（推奨: 8以下）
- リトライ間隔を長くする（500ms以上）

### 未知のBlueprint
```
Error: Unknown blueprint ID
```

**解決方法:**
- `blueprintCosts`に新しいBlueprintを追加
- または該当商品をスキップ

## 運用手順

### 日次チェック
1. GitHub Actionsが自動実行
2. レポート確認: `pricing-reports/pricing-analysis-*.json`
3. 問題商品があれば手動修正または自動修正実行

### 手動更新
1. 問題商品を特定
2. バッチ更新APIで一括修正
3. 結果を確認

### 新商品追加時
1. 自動的に適正価格が設定される（Blueprintが既知の場合）
2. 新しいBlueprintの場合は原価データを追加

## パフォーマンス

- 単一商品更新: ~1-2秒
- バッチ更新（10商品）: ~10-15秒
- 全ショップ更新（500商品）: ~8-10分（分割実行推奨）

## Vercel無料プラン制約

- 関数実行時間: 最大10秒
- 同時実行数: 制限あり
- ファイルシステム: 読み取り専用

**対策:**
- 大量更新は分割実行（offset/limit使用）
- ログはコンソール出力のみ
- 定期実行はGitHub Actions使用

## セキュリティ

- API Keyは環境変数で管理
- レート制限ミドルウェアで保護
- バリデーションで不正入力を防止

## 今後の拡張案

1. Slack/Discord通知
2. Webhookでリアルタイム価格監視
3. A/Bテスト機能（価格最適化）
4. ダッシュボードUI（Next.js）
5. 売上データとの連携

## サポート

問題が発生した場合:
1. Vercelログを確認
2. `pricing-reports/`のエラーログを確認
3. GitHub Issuesで報告
