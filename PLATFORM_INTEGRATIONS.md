# 🌐 プラットフォーム連携状況

**最終更新**: 2025-10-03
**バージョン**: 1.0

---

## 📊 現在の連携プラットフォーム

### ✅ **Printify** (グローバル市場)

**連携状態**: 完全統合済み

**販売チャネル**:
- Etsy (米国・グローバル)
- eBay US
- Printify Storefront (独自ストア)

**機能**:
- ✅ API経由での商品自動作成
- ✅ サイズ別価格自動設定（38%利益率）
- ✅ Etsy/eBayへの自動公開（24商品ずつ）
- ✅ Printify Expressサポート
- ✅ 既存商品の価格一括更新

**ワークフロー**:
```
デザイン生成 → Printify商品作成 → Etsy/eBay自動公開 → 注文時に製造・発送
```

**関連API**:
- `/api/printify-create-product.js`
- `/api/printify-batch-auto-generate.js`
- `/api/printify-publish-products.js`
- `/api/printify-update-prices.js`
- `/api/printify-enable-express.js`
- `/api/printify-check-stores.js`

---

### ✅ **SUZURI** (日本市場)

**連携状態**: 完全統合済み

**販売チャネル**:
- SUZURI独自マーケットプレイス

**機能**:
- ✅ OAuth 2.0認証
- ✅ API経由での商品自動作成
- ✅ 自動価格設定（SUZURI推奨価格）
- ✅ Tシャツ/パーカー/スウェット対応

**ワークフロー**:
```
デザイン生成 → SUZURI商品作成 → SUZURIマーケットプレイスに公開 → 注文時に製造・発送
```

**関連API**:
- `/api/suzuri-batch-create.js`
- `/api/suzuri-upload-image.js`
- `/api/suzuri-create-product.js`

---

### ⚠️ **BASE** (日本市場) - **無効化**

**連携状態**: API実装済みだが**手動設定必須のため無効化**

**問題点**:
- オリジナルプリント.jpアプリでの手動設定が必須
  - プリント位置（前面/背面）
  - プリントサイズ
  - 商品タイプ選択
- 1商品あたり3-5分の手動作業が必要
- API経由での自動設定は不可能

**判断**: 一括出品から除外し、手動運用のみ可能

**関連API** (保持されているが未使用):
- `/api/base-create-product.js`

---

### ❌ **Gelato** (グローバルネットワーク) - **削除済み**

**連携状態**: 2025-10-03に削除

**削除理由**:
1. **販売チャネルが存在しない**: Gelatoは注文フルフィルメントサービスであり、独自のマーケットプレイスを持たない
2. **Printifyと競合**: 現在Printify経由でEtsy/eBayに出品しているため、Gelatoと併用する必要がない
3. **実装内容が不適切**: ドラフト注文作成のみで、実際の販売フローに組み込まれていなかった

**Gelatoの正しい使い方**:
- **Etsy → Gelato連携**: Etsyストアの注文をGelato APIに転送して製造・発送
- **独自サイト → Gelato連携**: 自社ECサイトの注文をGelato APIに転送

**現状**: 上記のいずれも実装されておらず、Printifyで十分対応できているため不要

**関連API** (保持されているが未使用):
- `/api/gelato-test-connection.js`
- `/api/gelato-get-products.js`
- `/api/gelato-create-order.js`

**注**: 将来的にPrintifyから切り替える場合や独自サイトを構築する場合に備えて、APIファイルは保持

---

## 🔄 現在のワークフロー

### **一括出品フロー** (Printify + SUZURI)

```mermaid
デザイン生成
    ↓
┌──────────────────────────────────┐
│   並列出品処理                    │
├──────────────────────────────────┤
│ [Printify]              [SUZURI] │
│   ↓                        ↓     │
│ 商品作成                  商品作成 │
│   ↓                        ↓     │
│ Etsy/eBay公開           SUZURI公開│
└──────────────────────────────────┘
    ↓
顧客注文
    ↓
各PODプロバイダーが製造・発送
```

### **実装詳細**:

1. **フロントエンド** (`/public/index.html`):
   - 「Printify + SUZURIに一括出品」ボタン
   - 並列API呼び出し（Promise.all使用）
   - 各プラットフォームの成功/失敗を個別に表示

2. **バックエンド**:
   - `/api/printify-batch-auto-generate.js`: Printify商品作成
   - `/api/suzuri-batch-create.js`: SUZURI商品作成

3. **エラーハンドリング**:
   - 一方が失敗しても他方は継続
   - 各プラットフォームの結果を個別に表示

---

## 📈 将来的な拡張計画

### **短期（1-3ヶ月）**:
- ✅ Printify + SUZURI体制の運用安定化
- ✅ Etsy/eBayでの販売データ収集
- ✅ 利益率分析とプラットフォーム比較

### **中期（3-6ヶ月）**:
- 販売チャネルの追加検討
  - Amazon Handmade（審査あり）
  - Redbubble（自動化可能）
  - Society6（自動化可能）

### **長期（6ヶ月以上）**:
- 独自ECサイト構築
  - Shopify/WooCommerce + Printify連携
  - または Shopify/WooCommerce + Gelato連携
- 多言語対応（英語・日本語・中国語）

---

## 🔑 重要な制約事項

### **Vercelフリープラン**:
- Cron Jobsは使用不可（手動実行のみ）
- 関数実行時間: 10秒以内
- 関数ペイロードサイズ: 4.5MB以内
  - **413エラー対策**: 中間APIを経由せず、フロントエンドから各APIに直接並列呼び出し

### **Printify無料プラン**:
- 一括公開: 24商品まで（25商品以上は分割公開が必要）

### **API レート制限**:
- Printify: 2リクエスト/分（重い操作）
- SUZURI: 5リクエスト/分
- Gemini: 15リクエスト/分

---

## 📚 関連ドキュメント

- **PRINTIFY_WORKFLOW_GUIDE.md**: Printifyの詳細ワークフロー
- **SETUP.md**: アプリ全体のセットアップ手順
- **.env**: 各プラットフォームのAPIキー設定

---

## 🚨 トラブルシューティング

### **問題: 「⚠️ Etsyとの連携が見つかりません」と表示される**

**原因**: PrintifyアカウントにEtsyストアが接続されていない

**解決策**:
1. https://printify.com/app/ にアクセス
2. 「Manage my stores」→「Connect」→「Etsy」
3. 連携手順を実行
4. 「🔌 販売チャネル連携確認」ボタンで再確認

### **問題: 413エラー (Content Too Large)**

**原因**: 大きなBase64画像データがVercelの関数ペイロード制限（4.5MB）を超えた

**解決済み**: フロントエンドから各APIに直接並列呼び出しすることで解決済み

---

**このドキュメントは、プラットフォーム連携の記録として維持され、追加・変更時に更新されます。**
