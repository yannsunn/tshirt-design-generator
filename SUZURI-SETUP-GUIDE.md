# SUZURI出品システム - セットアップ&テストガイド

## 📋 概要

このシステムは、SUZURI APIを使用して**Material（画像）+ Products（商品）を1回のリクエストで自動作成**します。

### ✅ 自動作成される商品（61種類）

**Tシャツ系（8種類）**
- スタンダードTシャツ (ID: 1)
- ヘビーウェイトTシャツ (ID: 148)
- オーバーサイズTシャツ (ID: 149)
- ビッグシルエットTシャツ (ID: 100)
- ドライTシャツ (ID: 112)
- オーガニックコットンTシャツ (ID: 111)
- ライトウェイトTシャツ (ID: 360)
- ワンポイントTシャツ (ID: 162)

**長袖・パーカー系（7種類）**
- ロングスリーブTシャツ (ID: 15)
- ビッグシルエットロングスリーブTシャツ (ID: 106)
- パーカー (ID: 9)
- ビッグシルエットパーカー (ID: 96)
- ヘビーウェイトパーカー (ID: 152)
- ジップパーカー (ID: 28)
- ヘビーウェイトジップパーカー (ID: 153)

**スウェット系（3種類）**
- スウェット (ID: 5)
- ビッグシルエットスウェット (ID: 95)
- ヘビーウェイトスウェット (ID: 154)

**バッグ系（6種類）**
- トートバッグ (ID: 2)
- ランチトートバッグ (ID: 158)
- サコッシュ (ID: 16)
- エコバッグ (ID: 108)
- ビッグショルダーバッグ (ID: 62)
- きんちゃく (ID: 61)

**スマホケース系（5種類）**
- スマホケース（iPhone） (ID: 4)
- スマホケース（Android） (ID: 294)
- クリアスマホケース (ID: 18)
- ソフトクリアスマホケース (ID: 98)
- 手帳型スマホケース (ID: 23)

**アクセサリー・雑貨（32種類）**
- マグカップ (ID: 3)
- ステッカー (ID: 11)
- ノート (ID: 10)
- ブランケット (ID: 13)
- タオルハンカチ (ID: 14)
- フェイスタオル (ID: 393)
- 缶バッジ (ID: 17)
- 吸着ポスター (ID: 20)
- アクリルキーホルダー (ID: 147)
- アクリルブロック (ID: 21)
- アクリルスタンド (ID: 159)
- グラス (ID: 97)
- ロンググラス (ID: 150)
- サーモタンブラー (ID: 109)
- クッション (ID: 151)
- バンダナ (ID: 107)
- フルグラフィックTシャツ (ID: 8)
- フルグラフィックマスク (ID: 110)
- 刺しゅうTシャツ (ID: 155)
- 刺しゅうフリースジャケット (ID: 327)
- ジェットキャップ (ID: 99)
- バケットハット (ID: 102)
- サンダル (ID: 105)
- ソックス (ID: 161)
- くるぶしソックス (ID: 160)
- クリアファイル (ID: 101)
- クリアマルチケース (ID: 103)
- ミニクリアマルチケース (ID: 104)
- フラットポーチ (ID: 426)
- フラット缶ケース (ID: 228)
- マスキングテープ (ID: 261)
- スマホストラップ (ID: 195)

---

## ✅ 実装完了事項

### 1. バックエンドAPI実装
**ファイル**: [api/suzuri-batch-create.js](api/suzuri-batch-create.js)

**変更内容**:
- ✅ **Material + 61種類の全Products を1リクエストで作成**
- ✅ **SUZURI API v1から取得した正確なItem IDを使用**
- ✅ **レート制限対応（5リクエスト/分）**

**コード例**:
```javascript
const materialBody = {
    texture: imageUrl,        // 画像URL
    title: title,             // 商品タイトル
    products: [               // 1回のリクエストで全61種類のProducts作成
        { itemId: 1, published: true },    // スタンダードTシャツ
        { itemId: 2, published: true },    // トートバッグ
        { itemId: 3, published: true },    // マグカップ
        { itemId: 4, published: true },    // スマホケース（iPhone）
        { itemId: 5, published: true },    // スウェット
        // ... 計61種類
    ]
};
```

### 2. フロントエンド実装
**ファイル**: [public/index.html](public/index.html)

**一括出品（Batch Publish）** - 3442-3463行目:
```javascript
const suzuriBody = {
    imageUrl: compressedImage,
    title: suzuriTitle,
    published: true,
    // SUZURI 全商品タイプ（61種類）を自動作成
    createStandardTshirt: true, createToteBag: true, createMug: true,
    createPhoneCase: true, createSweatshirt: true, createHoodie: true,
    // ... 計61種類のフラグを全てtrue
};
```

**個別出品（Manual Publish）** - 3681-3702行目:
同じ設定で61種類の商品を自動作成

---

## 🧪 テスト手順

### Step 1: 新規デザインで出品テスト

1. **デザイン生成画面** (https://design-generator-puce.vercel.app/) で新しいデザインを1つ生成
2. **「一括出品」または「個別出品」**ボタンをクリック
3. **ブラウザコンソール**（F12）で以下のログを確認:

```
✅ [1/1] SUZURI出品完了: 61商品
```

4. **SUZURI管理画面**にアクセス:
   - https://suzuri.jp/
   - ログイン後、マイページへ
   - **「アイテム」または「商品管理」**セクションを確認

### Step 2: 実際の商品確認

SUZURI管理画面で以下を確認してください:

- [ ] **Material（画像）が1件作成されている**
- [ ] **Products（商品）が61件作成されている**:
  - [ ] Tシャツ系（8種類）
  - [ ] 長袖・パーカー系（7種類）
  - [ ] スウェット系（3種類）
  - [ ] バッグ系（6種類）
  - [ ] スマホケース系（5種類）
  - [ ] アクセサリー・雑貨（32種類）
- [ ] 各商品が**「公開」状態**になっている

### Step 3: Vercelログで確認

https://vercel.com/あなたのプロジェクト/logs

**検索キーワード**: `/api/suzuri-batch-create`

**期待されるログ**:
```
📤 Material + 61種類の商品を作成中...
✅ Material作成成功: ID xxxxx
✅ Products作成成功: 61件
✅ SUZURI一括作成完了: 61/61件成功
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

4. **61種類の商品すべて**で繰り返す（または一括設定機能を使用）

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
✅ [1/1] SUZURI出品完了: 61商品

[Vercelログ]
🚀 SUZURI一括商品作成: デザインタイトル
📤 Material + 61種類の商品を作成中...
✅ Material作成成功: ID 12345
✅ Products作成成功: 61件
✅ SUZURI一括作成完了: 61/61件成功
```

### エラー時
```
❌ SUZURI一括作成エラー: Material + Products作成失敗 (401)
```
→ SUZURI_ACCESS_TOKEN が無効の可能性

---

## 🚀 現在の実装状況

✅ **61種類すべての商品タイプに対応完了**

本システムは、SUZURI API v1 (`/api/v1/items`) から取得した全61種類の商品タイプに完全対応しています。

### すでに実装済みの商品（61種類）
- Tシャツ系: 8種類
- 長袖・パーカー系: 7種類
- スウェット系: 3種類
- バッグ系: 6種類
- スマホケース系: 5種類
- アクセサリー・雑貨: 32種類

### 新商品が追加された場合の対応手順

SUZURIが新しい商品タイプを追加した場合:

1. **Item IDを確認**:
```bash
curl -H "Authorization: Bearer $SUZURI_ACCESS_TOKEN" \
  https://suzuri.jp/api/v1/items | jq '.items[] | {id, name, humanizeName}'
```

2. **バックエンド修正** ([api/suzuri-batch-create.js](api/suzuri-batch-create.js)):
```javascript
// パラメータに追加
createNewItem = true,  // 新商品

// products配列に追加
if (createNewItem) productsArray.push({ itemId: XXX, published: published });
```

3. **フロントエンド修正** ([public/index.html](public/index.html)):
```javascript
const suzuriBody = {
    // 既存パラメータ...
    createNewItem: true  // 新商品追加
};
```

---

## 🔍 トラブルシューティング

### Q1. 「Material作成成功」だけでProducts作成のログが出ない
**原因**: SUZURI APIレスポンスに`products`配列が含まれていない
**確認**:
- Vercelログで実際のAPIレスポンスを確認
- `result.products`が`undefined`になっていないか

### Q2. 「61商品作成」と表示されるが、SUZURI管理画面で見つからない
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
2. ✅ **SUZURI管理画面で61商品が作成されたか確認**
3. ✅ **各商品にトリブン +800円を手動設定**
4. ✅ **定期的にSUZURI APIの新商品をチェック**

---

## 📞 完了報告

テスト完了後、以下を報告してください:

- [ ] Material作成: 成功 / 失敗
- [ ] Products作成: 61件 / X件 / 0件
- [ ] SUZURI管理画面での確認: 完了 / 未完了
- [ ] トリブン設定: 完了 / 未完了
- [ ] エラーが発生した場合: エラーメッセージ

---

## 📊 2025年10月9日時点の状況

✅ **完全実装済み**
- バックエンド: 61種類すべてのSUZURI商品に対応
- フロントエンド: 一括出品・個別出品の両方で61種類対応
- デプロイ済み: https://design-generator-puce.vercel.app/
- SUZURI API v1の全商品タイプに完全対応

🔄 **今後の対応**
- SUZURIが新商品を追加した際に、本ガイドの手順で追加実装が可能
