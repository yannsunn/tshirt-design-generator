# 未出品商品の管理・自動出品ガイド

**作成日**: 2025-10-11
**目的**: Supabase履歴のクリーンアップと、Printify未出品商品の自動出品

---

## 📋 概要

このガイドでは以下の作業を行います：

1. **Supabase履歴のクリーンアップ**: 未出品のデザインアイデアを削除
2. **Printify商品の価格確認**: 38%マージン、末尾$X.99の確認
3. **未出品商品の特定**: 出品可能商品をリストアップ
4. **自動出品**: 条件を満たす商品を自動で出品

---

## 🗄️ Supabase履歴のクリーンアップ

### 履歴確認
```bash
# 全履歴を確認
curl -X POST https://design-generator-puce.vercel.app/api/get-idea-history \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'
```

### 履歴削除

#### オプション1: 全削除
```bash
curl -X POST https://design-generator-puce.vercel.app/api/cleanup-idea-history \
  -H "Content-Type: application/json" \
  -d '{"deleteAll": true}'
```

#### オプション2: 古いデータのみ削除（30日以上前）
```bash
curl -X POST https://design-generator-puce.vercel.app/api/cleanup-idea-history \
  -H "Content-Type: application/json" \
  -d '{"deleteAll": false, "keepDays": 30}'
```

**レスポンス例**:
```json
{
  "success": true,
  "deleted": 150,
  "remaining": 25,
  "message": "全アイデア履歴を削除しました（残り: 25件）"
}
```

---

## 💰 Printify商品の価格確認

### 全商品の価格チェック
```bash
curl https://design-generator-puce.vercel.app/api/printify-check-prices
```

**確認ポイント**:
- ✅ **38%マージン**: 37.5% 〜 38.5%
- ✅ **末尾$X.99**: 例: $9.99, $12.99, $22.99
- ✅ **赤字なし**: 全商品が利益を確保

**レスポンス例**:
```json
{
  "summary": {
    "total": 8,
    "allMeetingTarget": 8,
    "someIssues": 0
  },
  "results": [
    {
      "name": "Gildan 5000 T-Shirt",
      "allMeetTarget": true,
      "note": "✅ 全サイズが38%以上"
    }
  ]
}
```

---

## 📦 未出品商品の確認

### ショップ別の未出品商品をチェック

#### Storefront（ショップID: 24566516）
```bash
curl "https://design-generator-puce.vercel.app/api/check-unpublished-products?shopId=24566516"
```

#### eBay（ショップID: 24565480）
```bash
curl "https://design-generator-puce.vercel.app/api/check-unpublished-products?shopId=24565480"
```

#### Etsy（ショップID: 24566474）
```bash
curl "https://design-generator-puce.vercel.app/api/check-unpublished-products?shopId=24566474"
```

**レスポンス例**:
```json
{
  "summary": {
    "total": 506,
    "unpublished": 150,
    "readyToPublish": 120,
    "invalidPrice": 30
  },
  "readyToPublish": [
    {
      "id": "abc123",
      "title": "Japanese Samurai T-Shirt",
      "blueprintId": 6,
      "isPublished": false,
      "hasValidPrice": true,
      "variantCount": 3
    }
  ]
}
```

**サマリー説明**:
- **total**: 全商品数
- **unpublished**: 未出品商品数
- **readyToPublish**: 出品準備完了（価格OK）
- **invalidPrice**: 価格要修正

---

## 🚀 自動出品

### ドライラン（確認のみ、実際には出品しない）

#### Storefront
```bash
curl -X POST https://design-generator-puce.vercel.app/api/auto-publish-ready-products \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "24566516",
    "dryRun": true
  }'
```

#### eBay
```bash
curl -X POST https://design-generator-puce.vercel.app/api/auto-publish-ready-products \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "24565480",
    "dryRun": true
  }'
```

**ドライランレスポンス**:
```json
{
  "dryRun": true,
  "message": "120件の商品が出品可能です（ドライラン）",
  "readyProducts": [
    { "id": "abc123", "title": "Japanese Samurai T-Shirt" }
  ],
  "note": "dryRun=false で実際に出品します"
}
```

### 実際に出品（dryRun: false）

⚠️ **注意**: 実際に出品されます！

#### Storefront（確認後に実行）
```bash
curl -X POST https://design-generator-puce.vercel.app/api/auto-publish-ready-products \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "24566516",
    "dryRun": false
  }'
```

#### eBay（確認後に実行）
```bash
curl -X POST https://design-generator-puce.vercel.app/api/auto-publish-ready-products \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "24565480",
    "dryRun": false
  }'
```

**実行レスポンス**:
```json
{
  "success": true,
  "summary": {
    "total": 120,
    "published": 118,
    "failed": 2
  },
  "results": {
    "published": [
      { "id": "abc123", "title": "Japanese Samurai T-Shirt" }
    ],
    "failed": [
      { "id": "def456", "title": "...", "error": "..." }
    ]
  }
}
```

---

## 📝 SUZURI出品について

### SUZURIの取り分設定

**重要**: SUZURIは自動出品後、管理画面で手動設定が必要です。

1. **SUZURI管理画面**にログイン: https://suzuri.jp/
2. **アイテム管理**に移動
3. **各商品のトリブン（取り分）を設定**: 推奨 +800円
4. **61商品すべてに設定**

### SUZURI自動出品の条件

- ✅ **価格チェック不要**: SUZURIは取り分を後で設定するため
- ✅ **全商品出品OK**: トリブンは後から調整可能

---

## 🔄 推奨ワークフロー

### Step 1: 価格確認
```bash
# 全ショップの価格を確認
curl https://design-generator-puce.vercel.app/api/printify-check-prices
```

### Step 2: 未出品商品確認（ドライラン）
```bash
# Storefront
curl "https://design-generator-puce.vercel.app/api/check-unpublished-products?shopId=24566516"

# eBay
curl "https://design-generator-puce.vercel.app/api/check-unpublished-products?shopId=24565480"
```

### Step 3: 自動出品（ドライランで確認）
```bash
# Storefront（ドライラン）
curl -X POST https://design-generator-puce.vercel.app/api/auto-publish-ready-products \
  -H "Content-Type: application/json" \
  -d '{"shopId": "24566516", "dryRun": true}'

# eBay（ドライラン）
curl -X POST https://design-generator-puce.vercel.app/api/auto-publish-ready-products \
  -H "Content-Type: application/json" \
  -d '{"shopId": "24565480", "dryRun": true}'
```

### Step 4: 実際に出品（確認後）
```bash
# Storefront（実行）
curl -X POST https://design-generator-puce.vercel.app/api/auto-publish-ready-products \
  -H "Content-Type: application/json" \
  -d '{"shopId": "24566516", "dryRun": false}'

# eBay（実行）
curl -X POST https://design-generator-puce.vercel.app/api/auto-publish-ready-products \
  -H "Content-Type: application/json" \
  -d '{"shopId": "24565480", "dryRun": false}'
```

### Step 5: SUZURI取り分設定（手動）
1. SUZURI管理画面にログイン
2. 61商品にトリブン +800円を設定

### Step 6: Supabase履歴クリーンアップ
```bash
# 全削除（出品済みなので不要）
curl -X POST https://design-generator-puce.vercel.app/api/cleanup-idea-history \
  -H "Content-Type: application/json" \
  -d '{"deleteAll": true}'
```

---

## ⚠️ 注意事項

### Printify自動出品の条件
- ✅ **38%マージン**: 37.5% 〜 38.5%
- ✅ **末尾$X.99**: 例: $9.99, $12.99
- ✅ **未出品**: `is_locked: false`

### SUZURIの制約
- ❌ **トリブン自動設定不可**: API未対応
- ✅ **後から設定可能**: 管理画面で手動設定

### レート制限
- **Printify API**: 90リクエスト/分
- **自動出品**: 1秒待機（安全マージン）
- **大量出品**: 分割実行推奨

---

## 📊 実行例

### 例: Storefront 120商品を自動出品

```bash
# Step 1: 価格確認
curl https://design-generator-puce.vercel.app/api/printify-check-prices
# → ✅ 全商品38%マージン、末尾$X.99

# Step 2: 未出品商品確認
curl "https://design-generator-puce.vercel.app/api/check-unpublished-products?shopId=24566516"
# → 120件が出品準備完了

# Step 3: ドライラン
curl -X POST https://design-generator-puce.vercel.app/api/auto-publish-ready-products \
  -H "Content-Type: application/json" \
  -d '{"shopId": "24566516", "dryRun": true}'
# → "120件の商品が出品可能です（ドライラン）"

# Step 4: 実際に出品
curl -X POST https://design-generator-puce.vercel.app/api/auto-publish-ready-products \
  -H "Content-Type: application/json" \
  -d '{"shopId": "24566516", "dryRun": false}'
# → "118件出品成功、2件失敗"
```

---

## 🎉 完了後の確認

### Printify管理画面
1. https://printify.com/app/products にアクセス
2. 出品済み商品を確認
3. Storefront・eBayで表示されているか確認

### SUZURI管理画面
1. https://suzuri.jp/ にログイン
2. 61商品が表示されているか確認
3. トリブン設定を完了

---

**次回更新**: 新しい未出品商品が発生した際
