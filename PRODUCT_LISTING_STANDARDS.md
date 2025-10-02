# 📋 商品出品基準ガイド

**最終更新**: 2025-10-03
**バージョン**: 1.0
**重要度**: ⚠️ **CRITICAL** - すべての出品は必ずこの基準に従うこと

---

## 🎯 基本原則

### ターゲット顧客
- **主要**: 日本を訪れる外国人観光客
- **副次**: 海外の日本文化愛好家

### 言語戦略
- **商品タイトル**: 英語のみ
- **商品説明**: 英語のみ
- **デザインテキスト**: ひらがなのみ（日本文化要素として）

---

## ✅ 商品説明（English Only）

### 商品タイトル規則

**必須要件:**
- ✅ **英語のみ**
- ❌ 日本語（漢字・ひらがな・カタカナ）禁止

**フォーマット:**
```
[Style] T-Shirt - [Theme] Motif
```

**例:**
```
✅ Japanese Horror Culture T-Shirt - Samurai Motif
✅ Cute Japanese Kawaii T-Shirt - Cherry Blossom Motif
✅ Vintage Japanese Style T-Shirt - Ninja Motif
✅ Modern Japanese Design T-Shirt - Mt. Fuji Motif

❌ Japanese T-Shirt - こわいの？（ひらがな含む）
❌ サムライデザイン T-Shirt（日本語含む）
❌ Samurai デザイン（混在）
```

**実装:**
```javascript
// index.html - generateSEOTitle()
const generateSEOTitle = (idea) => {
    const fontStyle = idea.fontStyle || 'modern';
    const theme = idea.theme || '';

    const stylePrefixes = {
        'horror': 'Japanese Horror Culture',
        'pop': 'Cute Japanese Kawaii',
        'retro': 'Vintage Japanese Style',
        'modern': 'Modern Japanese Design'
    };

    // Extract English theme name
    let themeEnglish = '';
    const themeMatch = theme.match(/\(([^)]+)\)/);
    if (themeMatch) {
        themeEnglish = themeMatch[1];
    } else {
        themeEnglish = 'Traditional';
    }

    const prefix = stylePrefixes[fontStyle] || 'Japanese Culture';

    // IMPORTANT: No Japanese/Hiragana in title
    return `${prefix} T-Shirt - ${themeEnglish} Motif`;
};
```

---

### 商品説明規則

**必須要件:**
- ✅ **英語のみ**
- ❌ 日本語（漢字・ひらがな・カタカナ）禁止
- ✅ SEO最適化（キーワード含む）
- ✅ ベネフィット明確化

**フォーマット:**
```
Unique AI-generated Japanese-themed t-shirt design. [Style description]. Perfect souvenir for tourists visiting Japan.
```

**スタイル別説明文:**
```javascript
const styleDescriptions = {
    'horror': 'Featuring a spooky Japanese ghost design with traditional elements. Dark and mysterious aesthetic perfect for those who love Japanese horror culture.',
    'pop': 'Featuring a cute and colorful Japanese pop art design. Vibrant and playful aesthetic inspired by Japanese kawaii culture.',
    'retro': 'Featuring a vintage Japanese retro design with nostalgic elements. Classic aesthetic inspired by traditional Japanese art.',
    'modern': 'Featuring a contemporary Japanese design with clean lines. Modern aesthetic blending traditional and contemporary elements.'
};
```

**実装:**
```javascript
// index.html - getEnglishDescription()
const getEnglishDescription = (idea) => {
    if (!idea) return 'AI-generated unique Japanese-themed t-shirt design. Perfect souvenir for tourists visiting Japan.';

    const fontStyle = idea.fontStyle || 'modern';
    const styleDesc = styleDescriptions[fontStyle] || styleDescriptions['modern'];

    return `Unique AI-generated Japanese-themed t-shirt design. ${styleDesc} Perfect souvenir for tourists visiting Japan.`;
};
```

---

## 🎨 デザインテキスト（Hiragana Only）

### テキスト規則

**必須要件:**
- ✅ **ひらがなのみ**
- ❌ 漢字禁止
- ❌ カタカナ禁止
- ❌ 英語禁止
- ✅ 5-10文字

**理由:**
1. **外国人観光客にとって読みやすい**: ひらがなはシンプルで認識しやすい
2. **日本文化要素**: 漢字より親しみやすく、カタカナより日本的
3. **デザイン上の美しさ**: ひらがなは曲線的で視覚的に美しい

**例:**
```
✅ こわいの？
✅ にんじゃだ！
✅ さくらさく
✅ やまのぼり
✅ おまつりだ

❌ 怖いの？（漢字含む）
❌ ニンジャだ！（カタカナ含む）
❌ Samurai（英語）
❌ さくら咲く（漢字含む）
```

**実装:**
```javascript
// generate-ideas.js - systemPrompt
2. **フレーズ**: すべてひらがなで短く（5-10文字）、テーマに沿ったキャッチコピー。
   - **必ずひらがなのみを使用すること（漢字・カタカナ・英語禁止）**
   - **必ず4つとも異なるフレーズにすること**
```

---

## 💰 価格設定基準

### 価格計算方式

**目標利益率**: **38%**（業界標準30-40%の上位）

**価格フォーマット**: **USD $X.99**（心理的価格設定）

**サイズ別価格:**
- S-XL: 標準原価ベース
- 2XL: 原価+約33%
- 3XL: 原価+約67%

### 価格例（Printify MyLocker）

| 商品タイプ | S-XL | 2XL | 3XL |
|-----------|------|-----|-----|
| **Gildan 5000 T-Shirt** | $9.99 (39.9%) | $12.99 (38.4%) | $16.99 (41.1%) |
| **Gildan 64000 Softstyle** | $11.99 (38.2%) | $14.99 (37.6%) | $19.99 (40.2%) |
| **Gildan 18000 Sweatshirt** | $22.99 (39.1%) | $27.99 (39.3%) | $32.99 (39.4%) |
| **Gildan 18500 Hoodie** | $27.99 (39.3%) | $32.99 (39.4%) | $37.99 (39.5%) |

**実装:**
```javascript
// printify-create-product.js
const JPY_TO_USD = 150; // 1 USD = 150 JPY
const calculateOptimalPrice = (costJpy, targetMargin = 38) => {
    const costUsd = costJpy / JPY_TO_USD;
    const exactPriceUsd = costUsd / (1 - targetMargin / 100);
    const priceUsd = Math.ceil(exactPriceUsd) - 0.01; // $X.99形式
    return Math.round(priceUsd * 100); // セント単位
};
```

---

## 🌐 プラットフォーム別要件

### Printify（Etsy/eBay経由）

**必須設定:**
- ✅ 商品タイトル: 英語のみ
- ✅ 商品説明: 英語のみ
- ✅ 価格: USD $X.99形式、サイズ別価格
- ✅ タグ: `['Japanese Culture', 'AI Generated', 'Tourist Souvenir']`
- ✅ EU GPSR情報: 手動入力必須
- ✅ モックアップ: 90個選択推奨

**実装箇所:**
- `index.html`: `handleCreatePrintifyProduct()`, `handleCreateAllPrintifyProducts()`
- `batch-auto-generate.js`: バッチ処理
- `printify-create-product.js`: 商品作成API

### SUZURI

**必須設定:**
- ✅ 商品タイトル: 英語のみ
- ✅ Material title: 英語のみ
- ✅ 自動価格設定: SUZURI推奨価格
- ✅ 商品タイプ: Tシャツ、パーカー、スウェット

**実装箇所:**
- `index.html`: `handleSUZURICreate()`, `handlePublishAll()`
- `suzuri-batch-create.js`: バッチ作成API

---

## 🔍 検証チェックリスト

### デプロイ前チェック

#### 商品情報
- [ ] タイトルに日本語（漢字・ひらがな・カタカナ）が含まれていないか
- [ ] 説明文に日本語が含まれていないか
- [ ] デザインテキストがひらがなのみか
- [ ] タイトルが読みやすく、SEO最適化されているか

#### 価格設定
- [ ] 価格が$X.99形式か
- [ ] サイズ別価格が設定されているか（2XL/3XL）
- [ ] 利益率が38%前後か
- [ ] 為替レート（1USD=150JPY）が適正か

#### 画像・デザイン
- [ ] 画像が背景透過か
- [ ] デザインが中央配置か（x:0.5, y:0.45）
- [ ] サイズが適正か（scale:0.95）
- [ ] テキストがひらがなのみか

#### プラットフォーム連携
- [ ] Printify: Etsy/eBay連携確認済みか
- [ ] SUZURI: Access Token有効か
- [ ] エラーハンドリングが適切か

---

## 🚨 よくある間違い

### ❌ NG例

#### 1. タイトルに日本語を含む
```javascript
❌ const title = `${imgData.idea.character} - ${imgData.idea.phrase}`;
// Result: "提灯お化け - こわいの？" → 日本語含む
```

#### 2. 説明文に日本語を含む
```javascript
❌ const description = `オリジナルデザインの商品です。${title}`;
// Result: "オリジナルデザインの商品です。こわいの？" → 日本語含む
```

#### 3. phraseを直接使用
```javascript
❌ const title = imgData.idea.phrase; // ひらがなのみ
```

#### 4. 価格が$X.00形式
```javascript
❌ const price = Math.round(exactPrice); // $10.00形式
```

### ✅ OK例

#### 1. 正しいタイトル生成
```javascript
✅ const title = generateSEOTitle(imgData.idea);
// Result: "Japanese Horror Culture T-Shirt - Samurai Motif"
```

#### 2. 正しい説明文生成
```javascript
✅ const description = getEnglishDescription(imgData.idea);
// Result: "Unique AI-generated Japanese-themed t-shirt design..."
```

#### 3. 正しい価格設定
```javascript
✅ const priceUsd = Math.ceil(exactPriceUsd) - 0.01; // $X.99形式
```

---

## 📚 関連ドキュメント

- **PLATFORM_INTEGRATIONS.md**: プラットフォーム連携状況
- **PRINTIFY_WORKFLOW_GUIDE.md**: Printifyワークフロー詳細
- **SETUP.md**: 初期セットアップ手順

---

## 🔄 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-10-03 | 1.0 | 初版作成：英語タイトル・説明文、ひらがなフレーズ、USD $X.99価格設定、サイズ別価格 |

---

**このドキュメントに従うことで、すべてのプラットフォームで統一された高品質な商品出品が可能になります。**
