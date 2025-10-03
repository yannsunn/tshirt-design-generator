# 管理者向けスクリプト

このディレクトリには、Printify商品管理の自動化スクリプトが含まれています。

## 📋 スクリプト一覧

### 1. 商品マスターベース再作成（継続実行）

**ファイル:** `recreate-products-continuous.js`

**目的:** 既存商品をマスター商品ベースで再作成（タイムアウト対策版）

**特徴:**
- 9秒に1回、5商品ずつ処理してタイムアウトを回避
- 全ショップ（Storefront, Etsy, eBay）を自動処理
- 進捗状況をリアルタイム表示
- Ctrl+Cで中断可能

**使用方法:**
```bash
cd /mnt/c/Users/march/デザインドロップシッピング
node scripts/recreate-products-continuous.js
```

> 💡 `.env`ファイルから自動的にAPIキーを読み込みます。環境変数の設定は不要です。

**出力例:**
```
🔄 [Storefront] バッチ処理開始 (Offset: 0)
✅ [Storefront] 再作成: 3件、スキップ: 2件、エラー: 0件
  ✅ Japanese Mountain Art: 68xxx → 69xxx
  ⏭️ [MASTER] Gildan 5000: Master product
```

---

### 2. eBay商品自動公開

**ファイル:** `publish-ebay-products.js`

**目的:** eBayショップの未公開商品を自動で公開

**特徴:**
- 全商品を取得し、未公開商品のみをフィルター
- 10商品ずつバッチ処理
- 公開結果を詳細レポート

**使用方法:**
```bash
node scripts/publish-ebay-products.js
```

> 💡 `.env`ファイルから自動的にAPIキーを読み込みます。環境変数の設定は不要です。

**出力例:**
```
📊 商品統計:
  - 全商品: 150件
  - 公開済み: 100件
  - 未公開: 50件

📦 バッチ 1: 10商品
  ✅ 公開: 10件
  ❌ エラー: 0件
```

---

### 3. 市場リサーチ（インバウンド向け日本Tシャツ）

**ファイル:** `market-research-japan-tshirts.js`

**目的:** インバウンド観光客向け日本Tシャツ市場を分析

**特徴:**
- グローバル市場の需要分析
- 推奨デザインテーマTOP 5を提示
- 価格戦略・SEO戦略を含む包括的レポート
- JSON形式で保存

**使用方法:**
```bash
node scripts/market-research-japan-tshirts.js
```

**生成レポート内容:**
- 市場規模・成長率
- ターゲット市場セグメント
- 競合分析（Etsy, Amazon, Redbubble）
- 推奨商品テーマ5選
- 価格戦略（$28-$35推奨）
- SEOキーワード戦略
- アクションプラン

**推奨テーマ:**
1. 富士山 × ミニマリズム
2. 桜 × 禅
3. ラーメン × ユーモア
4. 漢字 × ストリート
5. 波 × アート（葛飾北斎風）

---

### 4. Etsy商品選定（50商品）

**ファイル:** `select-etsy-products.js`

**目的:** Storefront商品から市場リサーチに基づき最適な50商品を選定

**特徴:**
- 市場リサーチの推奨テーマに基づくスコアリング
- テーマ別配分を考慮した選定
- NGキーワード（著作権リスク）を自動除外
- 商品IDリストを出力（転送に便利）

**使用方法:**
```bash
node scripts/select-etsy-products.js
```

> 💡 `.env`ファイルから自動的にAPIキーを読み込みます。環境変数の設定は不要です。

**出力:**
- `product-selections/etsy-selection-[timestamp].json` - 詳細レポート
- `product-selections/etsy-product-ids-[timestamp].txt` - 商品IDリスト

**スコアリング基準:**
- 推奨テーマとのマッチ度
- 日本関連キーワード
- 公開状態
- 画像の有無

---

## 🔧 セットアップ

### 環境変数設定

✅ **既に設定済みです！**

プロジェクトルートの`.env`ファイルに以下のAPIキーが設定されています：
- `PRINTIFY_API_KEY`
- `GEMINI_API_KEY`
- `SUPABASE_URL` / `SUPABASE_ANON_KEY`
- その他

各スクリプトは自動的に`.env`ファイルを読み込むため、**追加の環境変数設定は不要**です。

### 依存関係

必要なパッケージ：
- `dotenv` - ✅ インストール済み
- 標準Node.js環境

追加インストール不要で、すぐに実行できます。

---

## 📊 推奨ワークフロー

### Etsy商品展開の完全フロー

1. **市場リサーチ実行**
   ```bash
   node scripts/market-research-japan-tshirts.js
   ```
   → レポートを確認し、市場動向を理解

2. **Etsy向け50商品選定**
   ```bash
   export PRINTIFY_API_KEY="your_key"
   node scripts/select-etsy-products.js
   ```
   → 選定された商品IDリストを取得

3. **選定商品をEtsyに転送**
   - Printify管理画面で商品を手動転送
   - または転送APIを使用（別途実装）

4. **価格設定**
   - 選定商品の価格を$28-$35に設定
   - 利益率38-42%を確保

5. **SEO最適化**
   - 商品タイトルに主要キーワードを含める
   - 説明文にストーリーを追加

6. **公開**
   - Etsyショップで公開

7. **モニタリング**
   - 2週間後に販売実績を分析
   - 売れ筋商品を特定して追加展開

---

## ⚠️ 注意事項

### マスターベース再作成について

- **古い商品の削除:** デフォルトでは削除しません（安全のため）
- **処理時間:** 商品数によっては数時間かかる場合があります
- **中断:** Ctrl+Cで安全に中断できます。次回は続きから処理されます

### eBay公開について

- **商品IDが必要:** 全商品を取得してから公開します
- **レート制限:** 3秒間隔でバッチ処理します

### 市場リサーチについて

- **定期実行推奨:** 市場トレンドは変化するため、月1回程度の再実行を推奨
- **カスタマイズ可能:** キーワードやテーマは編集可能

### 商品選定について

- **著作権注意:** アニメ・マンガキャラクターは自動除外されます
- **手動確認推奨:** 最終的には目視確認をお勧めします

---

## 🚀 高度な使用例

### 特定ショップのみ処理

`recreate-products-continuous.js`を編集：
```javascript
const SHOPS = [
    { id: '24566474', name: 'Etsy' }  // Etsyのみ
];
```

### 処理速度の調整

`recreate-products-continuous.js`を編集：
```javascript
const INTERVAL_MS = 12000; // 12秒に変更（より安全）
```

### 商品選定数の変更

`select-etsy-products.js`を編集：
```javascript
const TARGET_COUNT = 100; // 100商品に変更
```

---

## 📞 サポート

問題が発生した場合は、エラーメッセージとともにログを確認してください。

**よくある問題:**

1. **PRINTIFY_API_KEY not set**
   → `.env`ファイルにAPIキーが設定されているか確認してください
   → ✅ 通常は既に設定済みです

2. **Timeout errors**
   → インターバルを長くしてください（12秒など）

3. **Rate limit errors**
   → バッチサイズを小さくしてください

---

## 📝 ログファイル

スクリプトの出力はコンソールに表示されます。ログファイルに保存したい場合：

```bash
node scripts/recreate-products-continuous.js 2>&1 | tee logs/recreate.log
```
