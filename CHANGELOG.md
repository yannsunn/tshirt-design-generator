# 修正履歴 (Changelog)

## 2025-10-02 - Blueprint ID修正 & GPSR/Express自動設定

### 🔧 重要な修正

#### 1. **Blueprint ID修正**
**問題**: スウェットシャツ・フーディの商品作成が404エラーで失敗
```
Error: Blueprint of ID "7" could not be found
Error: Blueprint of ID "12" could not be found
```

**原因**: Print Provider 3 (MyLocker) で使用できるBlueprint IDが間違っていた

**修正内容**:
| 商品タイプ | 修正前 | 修正後 | 商品名 |
|------------|--------|--------|--------|
| Tシャツ | 6 ✅ | 6 ✅ | Gildan 5000 |
| スウェット | 7 ❌ | **49** ✅ | Gildan 18000 |
| フーディ | 12 ❌ | **77** ✅ | Gildan 18500 |

**確認方法**:
- `/api/printify-get-blueprints` エンドポイントを作成
- Print Provider 3のBlueprint一覧を取得して正しいIDを特定

**修正ファイル**:
- `api/printify-create-product.js` (lines 27-35)

---

#### 2. **GPSR（EU販売必須）自動設定**
**機能**: 商品作成時にGPSR情報を自動設定

**追加内容**:
```javascript
safety_information: `EU representative: HONSON VENTURES LIMITED, gpsr@honsonventures.com, 3, Gnaftis House flat 102, Limassol, Mesa Geitonia, 4003, CY

Product information: ${productName}, 2 year warranty in EU and Northern Ireland as per Directive 1999/44/EC

Warnings, Hazard: For adults, Made in Nicaragua

Care instructions: Machine wash: cold (max 30C or 90F), Non-chlorine: bleach as needed, Tumble dry: low heat, Do not iron, Do not dryclean`
```

**期待される動作**:
- Printify UIでGPSRチェックボックスが自動的にONになる
- EU販売に必要な情報が自動入力される

**修正ファイル**:
- `api/printify-create-product.js` (lines 257-265)

---

#### 3. **サイズ表自動追加（試行）**
**機能**: 商品説明にサイズ表を自動追加

**追加パラメータ** (推測):
```javascript
add_size_table: true,
include_size_table: true,
size_table_enabled: true
```

**注意**: これらは非公式パラメータのため、動作確認が必要

**修正ファイル**:
- `api/printify-create-product.js` (lines 267-269)

---

#### 4. **Express配送自動設定**
**機能**:
- 新規商品作成時にExpress配送を自動で有効化
- 既存商品のExpress一括設定機能

**追加ファイル**:
- `api/printify-enable-express.js` - 既存商品のExpress一括設定API
- フロントエンド: 「⚡ 既存商品のExpress一括設定」ボタン

**修正ファイル**:
- `api/printify-create-product.js` (line 256): `is_printify_express_enabled: true`
- `public/index.html` (lines 317-321, 1593-1661)

---

#### 5. **複数商品タイプ同時選択機能**
**機能**: 1デザインで複数商品タイプ（Tシャツ + スウェット + フーディ）を一括作成

**UI変更**:
- ドロップダウン → チェックボックスに変更
- 複数選択可能

**例**:
- 8デザイン × 3商品タイプ = **24商品を一括作成**

**Supabaseスキーマ変更**:
```sql
ALTER TABLE design_ideas ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'tshirt';
CREATE INDEX IF NOT EXISTS idx_design_ideas_product_type ON design_ideas(product_type);
```

**修正ファイル**:
- `api/generate-ideas.js` - 商品タイプ別の重複管理
- `api/save-ideas.js` - 商品タイプごとにアイデア保存
- `public/index.html` - チェックボックスUI、複数タイプ作成ロジック

---

### 📋 テスト必要項目

- [ ] スウェット/フーディの商品作成が成功するか
- [ ] GPSRチェックボックスが自動でONになるか
- [ ] サイズ表チェックボックスが自動でONになるか
- [ ] 複数商品タイプ同時作成が動作するか
- [ ] Express設定が自動で有効になるか

---

### 🚀 デプロイ情報

**コミット**: `aff041c`
**日時**: 2025-10-02
**Vercel**: 自動デプロイ済み

---

### 📝 既知の制限事項

1. **モックアップ選択**: Printify APIでは対応していないため手動設定が必要
2. **サイズ表自動追加**: 非公式パラメータのため動作未確認
3. **GPSR自動チェック**: `safety_information`設定でチェックが入るかは動作確認が必要

---

### 🔗 参考情報

- Printify API Documentation: https://developers.printify.com/
- Blueprint取得エンドポイント: `/api/printify-get-blueprints`
- GPSR情報: HONSON VENTURES LIMITED (EU代表)
