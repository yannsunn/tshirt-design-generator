# Etsy API統合計画

## 📋 現状

### ✅ 現在動作している機能
- **Printify Storefront一括出品**: 完全動作
  - 画像アップロード ✅
  - 商品作成（4種類：T-shirt, Softstyle Tee, Sweatshirt, Hoodie）✅
  - 価格最適化（38%利益率）✅
  - Storefront公開準備完了 ✅

### ⚠️ 現在の問題
- **Etsy手動出品**: 部分的に動作
  - Printifyへの画像アップロード ✅
  - Printify経由でEtsy商品作成 ✅
  - Printify経由でEtsy公開 ✅
  - **❌ Etsyリスティングに画像が表示されない**

### 🔍 問題の原因

PrintifyのPublish APIは、Printify側の商品情報をEtsyに同期しますが、**画像ファイル自体はEtsyにアップロードされません**。

Etsyのリスティングページで画像を表示するには、**Etsy APIを使って直接画像をアップロードする**必要があります。

---

## 🎯 Etsy API承認後の実装計画

### Phase 1: Etsy API認証設定（承認後すぐ）

#### 必要な環境変数
```bash
ETSY_API_KEY=your_api_key_here
ETSY_API_SECRET=your_api_secret_here
ETSY_SHOP_ID=your_shop_id_here
ETSY_ACCESS_TOKEN=your_oauth_token_here
```

#### 設定手順
1. Etsy Developer Portalでアプリケーション作成
2. OAuth 2.0認証フローの実装
3. Access Tokenの取得
4. Vercel環境変数に設定

---

### Phase 2: Etsy画像アップロードAPI実装

#### 新規APIエンドポイント: `api/etsy-upload-image.js`

```javascript
// Etsy APIで画像を直接アップロード
export default async function handler(req, res) {
    const { listingId, imageUrl } = req.body;
    const apiKey = process.env.ETSY_API_KEY;
    const accessToken = process.env.ETSY_ACCESS_TOKEN;
    const shopId = process.env.ETSY_SHOP_ID;

    // 1. 画像をダウンロード
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    // 2. Etsy APIで画像をアップロード
    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer]), 'design.png');

    const response = await fetch(
        `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listingId}/images`,
        {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData
        }
    );

    if (!response.ok) {
        throw new Error(`Etsy image upload failed: ${response.status}`);
    }

    const result = await response.json();
    return res.status(200).json(result);
}
```

---

### Phase 3: Etsy手動出品機能の修正

#### 修正箇所: `public/index.html` の `handleManualPublishSingle` 関数

**現在のフロー**:
1. Printifyに画像アップロード ✅
2. Printify経由でEtsy商品作成 ✅
3. Printify経由でEtsy公開 ✅
4. **❌ 画像がEtsyに表示されない**

**修正後のフロー**:
1. Printifyに画像アップロード ✅
2. Printify経由でEtsy商品作成 ✅
3. **🆕 Printify画像URLを取得**
4. **🆕 Etsy APIで画像を直接アップロード**
5. Printify経由でEtsy公開 ✅
6. ✅ 画像がEtsyに表示される！

#### 実装コード（追加部分）

```javascript
// Step 3.5: Etsy APIで画像をアップロード（新規追加）
if (etsyProductIds.length > 0) {
    progressText.textContent = `⏳ Etsy: 画像アップロード中...`;

    // Printify画像URLを取得
    const imageDetailsResponse = await fetch(
        `${API_BASE_URL}/get-printify-product?shopId=${etsyShopId}&productId=${etsyProductIds[0]}`
    );
    const imageDetails = await imageDetailsResponse.json();
    const printifyImageUrl = imageDetails.product.images[0]?.src;

    // Etsy Listing IDを取得（Printify external propertyから）
    const etsyListingId = imageDetails.product.external?.id;

    if (printifyImageUrl && etsyListingId) {
        // Etsy APIで画像をアップロード
        const uploadImageResponse = await fetch(`${API_BASE_URL}/etsy-upload-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                listingId: etsyListingId,
                imageUrl: printifyImageUrl
            })
        });

        if (uploadImageResponse.ok) {
            console.log('✅ Etsy画像アップロード成功');
        } else {
            console.error('⚠️ Etsy画像アップロード失敗');
        }
    }
}
```

---

### Phase 4: タグと価格の最適化（Etsy API使用）

#### 新規APIエンドポイント: `api/etsy-update-listing.js`

```javascript
// Etsyリスティングのタグ・価格・説明を更新
export default async function handler(req, res) {
    const { listingId, tags, price, description } = req.body;
    const apiKey = process.env.ETSY_API_KEY;
    const accessToken = process.env.ETSY_ACCESS_TOKEN;
    const shopId = process.env.ETSY_SHOP_ID;

    const response = await fetch(
        `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listingId}`,
        {
            method: 'PATCH',
            headers: {
                'x-api-key': apiKey,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tags: tags,  // 最大13個
                description: description,
                price: price  // 例: 20.99
            })
        }
    );

    if (!response.ok) {
        throw new Error(`Etsy listing update failed: ${response.status}`);
    }

    const result = await response.json();
    return res.status(200).json(result);
}
```

#### タグの自動設定

**現在のスクリーンショットの問題**:
- タグ: 0個（最大13個使えるのに）

**修正後**:
```javascript
// generateEtsyTags関数で生成したタグをEtsy APIで設定
const tags = [
    'japanese',
    'kawaii',
    'tshirt',
    'japan',
    'cute',
    'anime',
    'design',
    'japanese art',
    'hokusai',
    'ukiyoe',
    'traditional',
    'cultural',
    'souvenir'
];

await fetch(`${API_BASE_URL}/etsy-update-listing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        listingId: etsyListingId,
        tags: tags.slice(0, 13),  // 最大13個
        price: 20.99,  // T-shirt価格
        description: printifyDescription
    })
});
```

---

## 📊 期待される改善効果

### Before（現在）
| 項目 | 状態 |
|------|------|
| 画像 | ❌ 表示されない |
| タグ | ❌ 0個 |
| 価格 | ⚠️ $44.99（高すぎ） |
| 説明 | ⚠️ 短い（4行のみ） |
| **コンバージョン率** | **0%（画像なしでは売れない）** |

### After（Etsy API統合後）
| 項目 | 状態 |
|------|------|
| 画像 | ✅ Printify画像が表示 |
| タグ | ✅ 13個（SEO最適化） |
| 価格 | ✅ $20.99（競争力あり） |
| 説明 | ✅ 詳細な説明文 |
| **コンバージョン率** | **2-5%（業界標準）** |

---

## 🚀 実装スケジュール

### Etsy API承認後すぐ（1日目）
- [ ] Etsy API認証設定
- [ ] `api/etsy-upload-image.js` 実装
- [ ] `api/etsy-update-listing.js` 実装
- [ ] Vercel環境変数設定

### 2日目
- [ ] `handleManualPublishSingle` 関数修正
- [ ] 画像アップロード機能テスト
- [ ] タグ・価格最適化テスト

### 3日目
- [ ] 既存のEtsy商品を修正するスクリプト作成
- [ ] 一括修正の実行
- [ ] 本番運用開始

---

## 🔧 N8nワークフロー（代替案）

Etsy API承認が遅れる場合、N8nで手動対応も可能です。

### ワークフロー構成

```
1. [トリガー] Webhook（Printify商品作成完了時）
   ↓
2. [HTTP Request] Printify APIで画像URL取得
   ↓
3. [HTTP Request] 画像をダウンロード
   ↓
4. [Code] Base64エンコード
   ↓
5. [HTTP Request] Etsy APIで画像アップロード
   ↓
6. [HTTP Request] Etsyタグ・価格更新
   ↓
7. [完了] 通知
```

### 必要なノード
- Webhook Trigger
- HTTP Request (×4)
- Code (JavaScript)
- Set Variables

---

## 💡 当面の運用方針

### ✅ 今すぐできること
1. **Printify Storefrontで継続出品**
   - 「Printify Storefront 一括出品」ボタン使用
   - 画像・価格は完璧に設定される
   - 180商品すでに公開中

2. **Etsy手動出品は一時停止**
   - API承認後に再開
   - 既存のEtsy商品は手動で画像追加が必要

3. **日本アートテーマを活用**
   - 🌊 神奈川沖浪裏（The Great Wave）
   - 🗻 赤富士（Red Fuji）
   - 🐱 国芳の猫（Kuniyoshi's Cats）
   - これらは訪日観光客に人気が高い

### 📈 推奨ワークフロー

**毎日の作業**:
1. デザインツールにアクセス
2. 日本アートテーマで5-10デザイン生成
3. 「Printify Storefront 一括出品」ボタンで出品
4. Printify管理画面で確認・公開

**Etsy API承認後**:
1. Etsy手動出品機能を再開
2. 既存商品の画像を一括修正
3. Etsy + Printify Storefrontで並行運用

---

## 📞 次のアクション

### ユーザー様にお願いすること
1. **Etsy API承認を待つ**
   - 承認通知が来たらすぐに教えてください
   - API Key, API Secret, Shop IDを準備

2. **当面はPrintify Storefrontで運用**
   - 「Printify Storefront 一括出品」ボタンを使用
   - 特に日本アートテーマで商品を増やす

### 私が準備すること
1. ✅ Etsy画像アップロードAPIの実装準備完了
2. ✅ Etsyリスティング更新APIの実装準備完了
3. ✅ フロントエンド修正コードの準備完了

Etsy API承認が来たら、**即日対応可能**な状態です！

---

**作成日**: 2025-10-27
**ステータス**: Etsy API承認待ち
**次回更新**: API承認後
