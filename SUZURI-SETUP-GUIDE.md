# SUZURI出品システム - セットアップ&テストガイド

## 📋 概要

このシステムは、SUZURI APIを使用して**Material（画像）+ Products（商品）を1回のリクエストで自動作成**します。

### 自動作成される商品（6種類）
1. **Tシャツ** (Item ID: 1)
2. **パーカー** (Item ID: 2)
3. **スウェット** (Item ID: 3)
4. **トートバッグ** (Item ID: 5)
5. **マグカップ** (Item ID: 7)
6. **スマホケース** (Item ID: 8)

---

## ✅ 実装完了事項

### 1. バックエンドAPI修正
**ファイル**: `/api/suzuri-batch-create.js`

**変更内容**:
- ❌ **旧実装**: Material作成 → 各Product個別作成（複数リクエスト）
- ✅ **新実装**: Material + 全Products を1リクエストで作成

**コード例**:
```javascript
const materialBody = {
    texture: imageUrl,        // 画像URL
    title: title,             // 商品タイトル
    products: [               // 1回のリクエストで全Products作成
        { itemId: 1, published: true },   // Tシャツ
        { itemId: 2, published: true },   // パーカー
        { itemId: 3, published: true },   // スウェット
        { itemId: 5, published: true },   // トートバッグ
        { itemId: 7, published: true },   // マグカップ
        { itemId: 8, published: true }    // スマホケース
    ]
};
```

### 2. フロントエンド更新
**ファイル**: `/public/index.html`

**一括出品（Batch Publish）** - 3442-3453行目:
```javascript
const suzuriBody = {
    imageUrl: compressedImage,
    title: suzuriTitle,
    published: true,
    // すべての主要アイテムを自動作成
    createTshirt: true,
    createHoodie: true,
    createSweatshirt: true,
    createToteBag: true,
    createMug: true,
    createPhoneCase: true
};
```

**個別出品（Manual Publish）** - 3671-3682行目:
同じ設定で6種類の商品を自動作成

---

## 🧪 テスト手順

### Step 1: 新規デザインで出品テスト

1. **デザイン生成画面**で新しいデザインを1つ生成
2. **「一括出品」または「個別出品」**ボタンをクリック
3. **ブラウザコンソール**（F12）で以下のログを確認:

```
✅ [1/1] SUZURI出品完了: 6商品
```

4. **SUZURI管理画面**にアクセス:
   - https://suzuri.jp/
   - ログイン後、マイページへ
   - **「アイテム」または「商品管理」**セクションを確認

### Step 2: 実際の商品確認

SUZURI管理画面で以下を確認してください:

- [ ] **Material（画像）が1件作成されている**
- [ ] **Products（商品）が6件作成されている**:
  - [ ] Tシャツ
  - [ ] パーカー
  - [ ] スウェット
  - [ ] トートバッグ
  - [ ] マグカップ
  - [ ] スマホケース
- [ ] 各商品が**「公開」状態**になっている

### Step 3: Vercelログで確認

https://vercel.com/あなたのプロジェクト/logs

**検索キーワード**: `/api/suzuri-batch-create`

**期待されるログ**:
```
📤 Material + 6種類の商品を作成中...
✅ Material作成成功: ID xxxxx
✅ Products作成成功: 6件
```

---

## ⚙️ トリブン（利益）設定 - 手動作業が必要

### ⚠️ 重要
**トリブン（利益マージン）はAPIで設定できません**
各商品で**+800円のトリブン**を手動設定する必要があります。

### トリブン設定手順

1. **SUZURI管理画面**にログイン
   - https://suzuri.jp/

2. **商品一覧**または**アイテム管理**へ移動

3. **各商品ごと**に以下を設定:
   - 商品を選択
   - 「トリブン」または「価格設定」を開く
   - **+800円**に設定
   - 保存

4. **6種類の商品すべて**で繰り返す

### トリブン設定例
```
基本価格: 2,500円
トリブン: +800円
販売価格: 3,300円（自動計算）
```

---

## 📊 想定される動作

### 成功時
```
[ブラウザコンソール]
✅ [1/1] SUZURI出品完了: 6商品

[Vercelログ]
🚀 SUZURI一括商品作成: デザインタイトル
📤 Material + 6種類の商品を作成中...
✅ Material作成成功: ID 12345
✅ Products作成成功: 6件
✅ SUZURI一括作成完了: 6/6件成功
```

### エラー時
```
❌ SUZURI一括作成エラー: Material + Products作成失敗 (401)
```
→ SUZURI_ACCESS_TOKEN が無効の可能性

---

## 🚀 商品種類を増やす方法

60種類以上のアイテムがSUZURIで利用可能です。

### 追加手順（例: ステッカーを追加）

1. **Item IDを確認**:
   - SUZURI管理画面またはAPI仕様から確認
   - 例: ステッカー = Item ID 10（仮）

2. **バックエンド修正** (`/api/suzuri-batch-create.js`):
```javascript
const {
    // 既存のパラメータ...
    createSticker = false  // 追加
} = req.body;

// products配列に追加
if (createSticker) productsArray.push({ itemId: 10, published: published });
```

3. **フロントエンド修正** (`/public/index.html`):
```javascript
const suzuriBody = {
    // 既存のパラメータ...
    createSticker: true  // 追加
};
```

**所要時間**: 1商品追加あたり**約2分**（コピー&ペーストのみ）

---

## 🔍 トラブルシューティング

### Q1. 「Material作成成功」だけでProducts作成のログが出ない
**原因**: SUZURI APIレスポンスに`products`配列が含まれていない
**確認**:
- Vercelログで実際のAPIレスポンスを確認
- `result.products`が`undefined`になっていないか

### Q2. 「6商品作成」と表示されるが、SUZURI管理画面で見つからない
**確認ポイント**:
1. SUZURI管理画面で「下書き」タブも確認
2. アカウントが正しいか確認（複数アカウント使用時）
3. ブラウザの再読み込み（Ctrl + R）

### Q3. 「401 Unauthorized」エラー
**原因**: SUZURI_ACCESS_TOKENが無効または期限切れ
**解決**:
1. SUZURI管理画面でAPIトークンを再発行
2. Vercelの環境変数`SUZURI_ACCESS_TOKEN`を更新
3. Vercelプロジェクトを再デプロイ

---

## 📝 次のステップ

1. ✅ **このガイドに従ってテスト実施**
2. ✅ **SUZURI管理画面で6商品が作成されたか確認**
3. ✅ **各商品にトリブン +800円を手動設定**
4. ✅ **必要に応じて追加商品種類を実装**（ステッカー、アクリルキーホルダー等）

---

## 📞 完了報告

テスト完了後、以下を報告してください:

- [ ] Material作成: 成功 / 失敗
- [ ] Products作成: 6件 / X件 / 0件
- [ ] SUZURI管理画面での確認: 完了 / 未完了
- [ ] トリブン設定: 完了 / 未完了
- [ ] エラーが発生した場合: エラーメッセージ
