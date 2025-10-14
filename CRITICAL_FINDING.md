# ⚠️ 重要な発見: Blueprint原価データの不一致

## 🔍 問題の発見

リファクタリング中に、**既存のファイル間でBlueprint原価データが不一致**であることを発見しました。

---

## 📊 不一致の詳細

### Blueprint 26 (Gildan 980 Lightweight Tee)

| ファイル | baseCost | extraCost 2XL | extraCost 3XL |
|---------|----------|---------------|---------------|
| `update-all-shops-prices.js` (旧) | **1029** | **1406** | **1498** |
| `printify-update-prices-batch.js` (現行) | **1480** | **1987** | **2414** |
| `printify-calculate-optimal-prices.js` (旧) | **1480** | **1987** | **2414** |

### Blueprint 36 (Gildan 2000 Ultra Cotton Tee)

| ファイル | baseCost | extraCost 2XL | extraCost 3XL |
|---------|----------|---------------|---------------|
| `update-all-shops-prices.js` (旧) | **1231** | **1608** | **1700** |
| `printify-update-prices-batch.js` (現行) | **1195** | **1557** | **1810** |

### Blueprint 145 (Gildan 64000 Softstyle T-Shirt)

| ファイル | baseCost | extraCost 2XL | extraCost 3XL |
|---------|----------|---------------|---------------|
| `update-all-shops-prices.js` (旧) | **1096** | **1473** | **1565** |
| `printify-update-prices-batch.js` (現行) | **1192** | **1457** | **1743** |

### Blueprint 157 (Gildan 5000B Kids Tee)

| ファイル | baseCost |
|---------|----------|
| `update-all-shops-prices.js` (旧) | **1071** |
| `printify-update-prices-batch.js` (現行) | **1093** |

### Blueprint 80 (Gildan 2400 Long Sleeve Tee)

| ファイル | baseCost | extraCost 2XL | extraCost 3XL |
|---------|----------|---------------|---------------|
| `update-all-shops-prices.js` (旧) | **1398** | **1775** | **1867** |
| `printify-update-prices-batch.js` (現行) | **2089** | N/A | N/A |

### Blueprint 49 (Gildan 18000 Sweatshirt)

| ファイル | baseCost | extraCost 2XL | extraCost 3XL |
|---------|----------|---------------|---------------|
| `update-all-shops-prices.js` (旧) | **2230** | **2680** | **3130** |
| `printify-update-prices-batch.js` (現行) | **2230** | N/A | N/A |

### Blueprint 77 (Gildan 18500 Hoodie)

| ファイル | baseCost | extraCost 2XL | extraCost 3XL |
|---------|----------|---------------|---------------|
| `update-all-shops-prices.js` (旧) | **2700** | **3150** | **3600** |
| `printify-update-prices-batch.js` (現行) | **2847** | **3208** | **3615** |

---

## 🤔 原因

元々のシステムで、**複数のAPIファイルに異なる原価データが記載されていた**ことが原因です。

- `printify-update-prices-batch.js` - 「2025年10月時点の実測値」とコメントあり
- `update-all-shops-prices.js` - コメントなし、古いデータの可能性

---

## 💡 推奨対応

### オプション1: 最新データを採用（推奨）
`printify-update-prices-batch.js`の原価データ（2025年10月時点）を**正しいデータ**として採用する。

**理由**:
- 「2025年10月時点の実測値」というコメントがある
- より最近のファイルである可能性が高い
- `printify-calculate-optimal-prices.js`と一致している

### オプション2: ユーザーに確認
どちらの原価データが正しいか、ユーザーに確認する。

### オプション3: Printify APIから実際の原価を取得
Printify APIを呼び出して、現在の実際の原価を確認する。

---

## 📝 現在の状態

現在、リファクタリング後の`config/pricing-config.js`には、`printify-update-prices-batch.js`の原価データ（より新しいと思われるデータ）を採用しています。

---

## ⚠️ 影響範囲

この不一致により、過去に以下の可能性があります：

1. **異なる価格計算結果** - APIによって異なる価格が設定されていた可能性
2. **マージン率のズレ** - 古い原価で計算した場合、実際のマージンが異なる
3. **価格設定の混乱** - どちらが正しい価格か不明瞭

---

## ✅ 推奨アクション

1. **ユーザーに確認**: どちらの原価データが正しいか確認
2. **統一**: 正しいデータで`config/pricing-config.js`を更新
3. **検証**: 実際のPrintify原価を確認（可能であれば）
4. **ドキュメント**: 正しい原価データの情報源を記録

---

**発見日**: 2025-10-14
**発見者**: Claude Code (リファクタリング中)
**重要度**: 🔴 高 - 価格計算の正確性に影響
