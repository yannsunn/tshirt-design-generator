# eBayショップ マスター商品セットアップ

## 現状

eBayショップへの自動出品が一時的に無効化されています。

**理由:** eBayショップにマスター商品が設定されていないため

## 問題の詳細

`printify-create-product.js`は、マスター商品を複製して新商品を作成します。
現在、マスター商品IDは**Storefrontショップ専用**です：

```javascript
const masterProductIds = {
    tshirt: '68dffaef951b5797930ad3fa',  // Storefront専用
    // ... 他のタイプ
};
```

eBayショップには、これらのマスター商品IDが存在しないため、
`Failed to fetch master product: 400` エラーが発生します。

## 解決方法

### オプション1: eBayショップのマスター商品を作成（推奨）

#### ステップ1: Storefrontの商品をeBayにコピー

1. **Printifyダッシュボードにアクセス**
   https://printify.com/app/products

2. **Storefrontショップを選択**

3. **マスター商品を確認**
   以下の8商品を探します：
   - Gildan 5000 T-Shirt
   - Gildan 980 Lightweight Tee
   - Gildan 2000 Ultra Cotton Tee
   - Gildan 64000 Softstyle T-Shirt
   - Gildan 5000B Kids Tee
   - Gildan 2400 Long Sleeve Tee
   - Gildan 18000 Sweatshirt
   - Gildan 18500 Hoodie

4. **各商品を複製してeBayショップに追加**
   - 商品を選択 → "Duplicate" → "eBayショップ"を選択

#### ステップ2: マスター商品IDを取得

eBayショップに複製した商品のIDを取得します：

```bash
# APIで取得
curl -X GET "https://design-generator-puce.vercel.app/api/printify-list-products?shopId=24566516&limit=10"
```

または、Printifyダッシュボードで商品URLから取得：
```
https://printify.com/app/products/68e...../edit
                                    ↑
                                 この部分がID
```

#### ステップ3: コードを更新

`api/printify-create-product.js`を修正：

```javascript
// ショップごとのマスター商品IDマッピング
const masterProductIdsByShop = {
    '24565480': {  // Storefront
        tshirt: '68dffaef951b5797930ad3fa',
        // ...
    },
    '24566516': {  // eBay
        tshirt: '68e...',  // eBayショップのマスター商品ID
        // ...
    }
};

const masterProductIds = masterProductIdsByShop[shopId] || masterProductIdsByShop['24565480'];
```

#### ステップ4: フロントエンドを有効化

`public/index.html`の3175-3180行目を修正：

```javascript
const autoPublishShops = [
    { id: '24565480', name: 'Storefront' },
    { id: '24566516', name: 'eBay' }  // コメント解除
];
```

---

### オプション2: マスター商品を使わない出品方法（代替案）

`printify-create-product-v2.js`を作成し、マスター商品なしで商品作成：

```javascript
// Blueprint IDから直接商品を作成
const createProductDirectly = async (shopId, blueprintId, imageId, title, description) => {
    // Printify API: /v1/shops/{shop_id}/products.json
    // POST with blueprint_id, print_provider_id, variants, etc.
};
```

この方法は複雑ですが、マスター商品不要で動作します。

---

## 現在の動作状況

✅ **Storefront**: 自動出品
✅ **SUZURI**: 自動出品
⏸️ **eBay**: 一時無効化（マスター商品設定後に有効化）
✅ **Etsy**: 手動選択

---

## クイックスタート（最速解決）

### 1. マスター商品を作成

```bash
# Storefrontの商品をeBayに複製
# Printifyダッシュボードで手動実行
```

### 2. マスター商品IDを確認

```bash
curl "https://design-generator-puce.vercel.app/api/printify-list-products?shopId=24566516"
```

### 3. コード更新

```bash
# api/printify-create-product.js を修正
# ショップIDごとのマッピングを追加
```

### 4. デプロイ

```bash
git add api/printify-create-product.js public/index.html
git commit -m "Enable eBay auto-publish with master products"
git push
```

---

## サポート

問題が発生した場合：
1. Printifyダッシュボードでマスター商品を確認
2. API経由で商品IDを取得
3. GitHub Issuesで報告

## 参考リンク

- Printify API Docs: https://developers.printify.com/
- Printify Dashboard: https://printify.com/app/products
