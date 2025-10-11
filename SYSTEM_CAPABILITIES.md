# 🎨 システム機能完全ガイド

**バージョン**: 1.1.0
**最終更新**: 2025-10-10
**本番環境**: https://design-generator-puce.vercel.app

---

## 🎯 システム概要

**日本文化Tシャツデザイン自動生成 + 多販路自動出品システム**

AIで日本文化をテーマにしたTシャツデザインを自動生成し、複数のプラットフォーム（Printify、SUZURI、Etsy、eBay）に自動出品できる完全自動化システムです。

---

## ✨ 主要機能（8カテゴリー）

### 1️⃣ デザイン自動生成

#### 🎨 AIアイデア生成
- **Gemini 2.0 Flash Experimental** 使用
- **50+ テーマ選択**: 富士山、侍、忍者、寿司、桜など
- **3つのコンセプト提案**: 各テーマで異なるデザイン案
- **日本語キャッチフレーズ**: ひらがなメインの魅力的な文言
- **重複防止**: Supabaseで過去30日のアイデアを管理

#### 🖼️ AI画像生成
- **Gemini 2.5 Flash Image Preview** 使用（ご指定モデル）
- **高品質4500×5400px**: Printify推奨サイズ
- **2つのエンジン対応**:
  - **FAL AI**（推奨）: $0.05/枚、高品質・安定（Seedream 4.0）
  - **Gemini 2.5 Flash Image**: 無料、不安定（プレビュー版）
- **自動背景除去**: 四隅連結BFS方式（70-80%精度）
- **テキスト合成**: 4種類の日本語フォント自動選択

**生成パラメータ（Gemini）**:
```javascript
temperature: 1.5    // 最大多様性
topK: 60           // 多様性確保
topP: 0.98         // ランダム性向上
```

**生成可能なテーマ（8カテゴリー、50+テーマ）**:
- 🏯 **日本の伝統文化**: 富士山、侍、忍者、芸者、相撲、和服、神社仏閣
- 🐾 **日本の動物**: 柴犬、招き猫、鯉、鶴、狐、猫、鹿
- 🍱 **日本料理**: 寿司、ラーメン、抹茶、お好み焼き、たこ焼き、和菓子
- ⛩️ **日本の風景**: 鳥居、竹林、温泉、桜並木、紅葉
- 🎉 **季節イベント**: 花見、夏祭り、花火、お正月
- 🚄 **現代日本**: 新幹線、渋谷、東京タワー、アニメ
- 🎎 **日本の象徴**: だるま、折り紙、扇子、盆栽、茶道
- 🎃 **国際イベント**: 和風ハロウィン、和風クリスマス

**フォントスタイル**:
| スタイル | フォント | 用途 |
|---------|----------|------|
| **pop** | Zen Maru Gothic | 可愛い・カジュアル |
| **horror** | Shippori Mincho B1 | 怖い・重厚 |
| **retro** | Rampart One | 昭和レトロ・ポップ |
| **modern** | Zen Kaku Gothic New | モダン・クール |

---

### 2️⃣ Printify完全自動化

#### 📦 商品作成
- **3種類の商品タイプ**: Tシャツ、スウェット、フーディ
- **一括作成**: 8デザイン × 3タイプ = 24商品/回
- **Blueprint自動設定**:
  - Gildan 5000（Tシャツ）: Blueprint ID 6
  - Gildan 18000（スウェット）: Blueprint ID 49
  - Gildan 18500（フーディ）: Blueprint ID 77
- **Print Provider**: MyLocker (ID: 3)
- **価格自動設定**: 38%マージン維持

#### 🌍 EU販売対応（GPSR自動設定）
自動設定項目:
- ✅ EU代表者: HONSON VENTURES LIMITED
- ✅ 製造者情報
- ✅ 商品仕様・警告・ケア方法
- ✅ Printify UIで自動チェックON

#### 🚚 Express配送
- ✅ 新規商品: 自動有効化
- ✅ 既存商品: 一括設定API搭載

#### 💰 価格管理システム（48 API中 15 API）
- **全506商品対応**: Storefront、Etsy、eBay
- **自動価格最適化**: 38%マージン維持
- **Blueprint原価データ**: 7種類のBlueprint対応
  - Custom T-Shirt (Master): Blueprint 706
  - Custom Sweatshirt (Master): Blueprint 1296
  - Gildan 5000 T-Shirt: Blueprint 6
  - Gildan 18000 Sweatshirt: Blueprint 49
  - Next Level 6210 Tri-Blend: Blueprint 12
- **一括更新**: バッチ処理でレート制限対応
- **リアルタイム監視**: GitHub Actions定期実行（予定）

**価格管理API**:
```bash
# 単一商品更新
POST /api/printify-update-single-product

# バッチ更新（推奨）
POST /api/batch-update-products

# 全ショップ一括更新
POST /api/update-all-shops-prices

# 価格チェック
GET /api/printify-check-prices

# 価格計算
POST /api/printify-calculate-optimal-prices
```

#### ⚠️ 手動設定が必要な項目（API未対応）
- ❌ **モックアップ選択**: 90モックアップを手動選択
  - **対処法**: マスター商品でDuplicate機能使用
- ❌ **サイズ表チェック**: 「説明にサイズ表を追加」
- ❌ **パーソナライゼーション**: トグル設定

---

### 3️⃣ SUZURI 完全対応

#### 🎁 61種類の商品タイプ一括作成
**Material（画像）+ 61種類のProducts を1回のリクエストで自動作成**

**商品カテゴリー**:

**Tシャツ系（8種類）**:
- スタンダードTシャツ (ID: 1)
- ヘビーウェイトTシャツ (ID: 148)
- オーバーサイズTシャツ (ID: 149)
- ビッグシルエットTシャツ (ID: 100)
- ドライTシャツ (ID: 112)
- オーガニックコットンTシャツ (ID: 111)
- ライトウェイトTシャツ (ID: 360)
- ワンポイントTシャツ (ID: 162)

**長袖・パーカー系（7種類）**:
- ロングスリーブTシャツ (ID: 15)
- ビッグシルエットロングスリーブTシャツ (ID: 106)
- パーカー (ID: 9)
- ビッグシルエットパーカー (ID: 96)
- ヘビーウェイトパーカー (ID: 152)
- ジップパーカー (ID: 28)
- ヘビーウェイトジップパーカー (ID: 153)

**スウェット系（3種類）**:
- スウェット (ID: 5)
- ビッグシルエットスウェット (ID: 95)
- ヘビーウェイトスウェット (ID: 154)

**バッグ系（6種類）**:
- トートバッグ (ID: 2)
- ランチトートバッグ (ID: 158)
- サコッシュ (ID: 16)
- エコバッグ (ID: 108)
- ビッグショルダーバッグ (ID: 62)
- きんちゃく (ID: 61)

**スマホケース系（5種類）**:
- スマホケース（iPhone） (ID: 4)
- スマホケース（Android） (ID: 294)
- クリアスマホケース (ID: 18)
- ソフトクリアスマホケース (ID: 98)
- 手帳型スマホケース (ID: 23)

**アクセサリー・雑貨（32種類）**:
マグカップ、ステッカー、ノート、ブランケット、タオルハンカチ、フェイスタオル、缶バッジ、吸着ポスター、アクリルキーホルダー、アクリルブロック、アクリルスタンド、グラス、ロンググラス、サーモタンブラー、クッション、バンダナ、フルグラフィックTシャツ、フルグラフィックマスク、刺しゅうTシャツ、刺しゅうフリースジャケット、ジェットキャップ、バケットハット、サンダル、ソックス、くるぶしソックス、クリアファイル、クリアマルチケース、ミニクリアマルチケース、フラットポーチ、フラット缶ケース、マスキングテープ、スマホストラップ

#### ⚙️ 機能
- **一括出品**: デザイン1つで61商品自動作成
- **レート制限対応**: 5req/分を自動管理（12秒間隔）
- **正確なAPI ID**: SUZURI API v1から取得済み

#### ⚠️ 手動設定必須
- ❌ **トリブン（利益マージン）**: 各商品で手動設定が必要
  - 推奨: +800円/商品
  - SUZURI管理画面で設定

---

### 4️⃣ Etsy & eBay統合

#### 🛒 マルチプラットフォーム出品
- **Etsy**: Printify連携で自動出品
- **eBay**: マスター商品システムで効率化
- **在庫同期**: Webhook対応（設定済み）

#### 📊 マスター商品システム
- **Master Product作成**: 完全設定済みテンプレート
- **Duplicate機能**: マスターから大量複製
- **設定項目**:
  - モックアップ90個
  - サイズ表
  - パーソナライゼーション
  - GPSR情報

---

### 5️⃣ 品質保証システム（NEW! 🆕 v1.1.0）

#### 🧪 自動テスト（13テストケース）
```bash
npm test              # 全テスト実行
npm run test:watch    # 監視モード
npm run test:coverage # カバレッジレポート
```

**テスト対象**:
- ✅ ヘルスチェック（4テスト）
- ✅ アイデア生成・重複管理（4テスト）
- ✅ Printify API統合（5テスト）
- ✅ ロガー機能
- ✅ レート制限管理

**テストフレームワーク**:
- Jest 29.7.0（ESM対応）
- タイムアウト: 30秒（外部API対応）
- 並列実行: 無効（レート制限対策）

#### 🔍 エラー監視（NEW! 🆕）
**構造化ログ**:
```json
{
  "timestamp": "2025-10-10T12:34:56.789Z",
  "level": "error",
  "context": "api-name",
  "message": "Request failed",
  "error": {
    "message": "...",
    "stack": "..."
  },
  "environment": "production"
}
```

**機能**:
- ✅ パフォーマンス計測（タイマー機能）
- ✅ API呼び出しログ（メソッド、URL、ステータス、時間）
- ✅ エラー詳細記録（スタックトレース、コンテキスト）
- ✅ Vercelログで確認可能

**使用方法**:
```javascript
import { createLogger } from '../lib/logger.js';

const logger = createLogger('my-api');
const timer = logger.startTimer('operation');

try {
  logger.info('Processing', { userId: 123 });
  // 処理...
  timer.end({ result: 'success' });
} catch (error) {
  logger.error('Failed', error);
}
```

---

### 6️⃣ レート制限管理（NEW! 🆕）

#### 🚦 API別統一管理

| API | 制限/分 | 制限/日 | リトライ間隔 | 最大リトライ |
|-----|---------|---------|-------------|-------------|
| **Gemini** | 60 | 1,500 | 1秒 | 3回 |
| **Printify** | 90 | 無制限 | 1秒 | 3回 |
| **SUZURI** | 5 | 無制限 | 12秒 | 2回 |
| **remove.bg** | 60 | 無制限 | 1秒 | 2回 |

**機能**:
- ✅ 自動レート制限チェック
- ✅ 429エラー自動リトライ
- ✅ 使用状況トラッキング
- ✅ 分単位・日単位の制限管理

**使用方法**:
```javascript
import { withRateLimit } from '../lib/rate-limiter.js';

// 自動レート制限+リトライ
const result = await withRateLimit('GEMINI', async () => {
  return await callGeminiAPI();
});
```

**使用状況確認**:
```bash
curl https://design-generator-puce.vercel.app/api/rate-limit-status
```

**レスポンス例**:
```json
{
  "status": "success",
  "data": {
    "usage": [
      {
        "api": "GEMINI",
        "minute": { "used": 15, "limit": 60, "percentage": "25.0" },
        "day": { "used": 234, "limit": 1500, "percentage": "15.6" }
      }
    ]
  }
}
```

---

### 7️⃣ SNS投稿文自動生成

#### 📱 マーケティング支援
- **Gemini 2.0 Flash Experimental** 使用
- **商品説明自動生成**: 自然な日本語
- **ハッシュタグ提案**: トレンドを考慮
- **プラットフォーム別最適化**: Twitter、Instagram、Facebook対応

---

### 8️⃣ データ管理

#### 🗄️ Supabase連携
- **アイデア履歴保存**: 重複防止
- **商品タイプ別管理**: Tシャツ、スウェット、フーディ個別
- **過去30日検索**: 新鮮なアイデアを保証
- **無料枠500MB**: 月100商品でも余裕

**スキーマ**:
```sql
CREATE TABLE design_ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  theme TEXT NOT NULL,
  character TEXT NOT NULL,
  phrase TEXT NOT NULL,
  font_style TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'tshirt'
);
```

---

## 📊 生産能力・実績

### 生産能力
- **デザイン生成**: 8デザイン/回
- **Printify**: 24商品/回（8デザイン × 3タイプ）
- **SUZURI**: 61商品/回（1デザイン）
- **合計**: **最大85商品/回**
- **理論値**: 8デザイン × 61商品 = **488 SUZURI商品 + 24 Printify商品 = 512商品/回**

### 成功率
- Printify商品作成: **88%**（21/24成功、最終テスト）
- 背景除去: **70-80%**（四隅連結方式）
  - remove.bg使用時: **99%**
- GPSR自動設定: **100%**
- Express自動有効化: **100%**

### 処理時間
| 処理 | 時間 |
|------|------|
| アイデア生成 | 2-5秒 |
| 画像生成（FAL AI） | 5-10秒 |
| 画像生成（Gemini） | 10-20秒 |
| 背景除去 | 2-3秒 |
| テキスト合成 | 1秒 |
| **合計（1デザイン）** | **約15-20秒** |

### コスト（月100商品の場合）

#### パターンA: 完全無料
| 項目 | コスト |
|------|--------|
| アイデア生成（Gemini無料枠） | $0 |
| 画像生成（Gemini無料枠） | $0 |
| 背景除去（Printify自動） | $0 |
| データベース（Supabase無料枠） | $0 |
| **合計** | **$0/月** |

> Gemini無料枠: 500リクエスト/日（15,000/月）

#### パターンB: 高品質（推奨）
| 項目 | コスト |
|------|--------|
| アイデア生成（Gemini無料枠） | $0 |
| 画像生成（FAL AI $0.05×100） | $5 |
| 背景除去（remove.bg 50枚無料 + $0.20×50） | $10 |
| データベース（Supabase無料枠） | $0 |
| **合計** | **$15/月** |

---

## 🔧 技術スタック

### AIモデル
| 機能 | モデル | 用途 |
|------|--------|------|
| アイデア生成 | **Gemini 2.0 Flash Experimental** | テキスト生成 |
| 画像生成（メイン） | **Gemini 2.5 Flash Image Preview** | 画像生成 |
| 画像生成（代替） | **FAL AI Seedream 4.0** | 画像生成 |
| SNS投稿文 | **Gemini 2.0 Flash Experimental** | テキスト生成 |

### フロントエンド
- **HTML5 + Vanilla JavaScript**: 19万行
- **Tailwind CSS CDN**: ユーティリティファーストCSS
- **Canvas API**: 画像処理・テキスト合成
- **Google Fonts**: 日本語フォント4種類

### バックエンド（48 API）

**カテゴリー別内訳**:
1. **デザイン生成（3 API）**
   - `generate-ideas.js` - アイデア生成
   - `generate-image.js` - 画像生成
   - `generate-sns.js` - SNS投稿文

2. **Printify連携（15 API）**
   - 商品作成、価格管理、Blueprint取得、ショップ管理など

3. **SUZURI連携（3 API）**
   - 一括作成、画像アップロード、商品管理

4. **価格管理（8 API）**
   - 単一更新、バッチ更新、チェック、計算

5. **マスター商品（5 API）**
   - 作成、複製、リスト、チェック

6. **公開管理（4 API）**
   - Printify、Etsy、eBay、一括公開

7. **監視・管理（5 API）**
   - ヘルスチェック、レート制限、統計、リセット

8. **テスト・品質（5 API）**
   - テスト、ロガー、バリデーション

### インフラ
- **Vercel**: Serverless Functions、自動デプロイ
- **Supabase**: PostgreSQL（無料500MB）
- **GitHub**: バージョン管理
- **Node.js**: 18+ (ESM)

### テスト・品質保証（v1.1.0新機能）
- **Jest 29.7.0**: ESM対応テストフレームワーク
- **構造化ログ**: JSON形式、Vercel統合
- **レート制限管理**: 4つの外部API統一管理

---

## 🚀 ワークフロー例

### シナリオ1: 新デザイン8個を全プラットフォームに出品
```
1. テーマ選択
   └→ 「富士山と桜」を選択

2. 商品タイプ選択
   └→ Tシャツ + スウェット + フーディ

3. アイデア生成
   └→ Gemini 2.0 Flash が3案提示
   └→ 8個を選択

4. 一括画像生成（選択：FAL AI）
   └→ 8デザイン完成（2-3分）
   └→ 自動背景除去
   └→ テキスト合成完了

5. Printify出品
   └→ 「全画像でPrintify商品作成」クリック
   └→ 24商品自動作成（8デザイン × 3タイプ）
   └→ 38%マージン自動設定
   └→ GPSR情報自動設定
   └→ Express配送自動有効化

6. SUZURI出品
   └→ 「一括出品」ボタンクリック
   └→ 61商品×8デザイン = 488商品自動作成
   └→ レート制限自動管理（5req/分）

7. トリブン設定（手動）
   └→ SUZURI管理画面で+800円設定

8. 完了
   └→ 合計512商品出品完了！
   └→ 所要時間: 約10分
```

### シナリオ2: 価格一括調整（全506商品）
```
1. 価格チェックAPI実行
   └→ GET /api/printify-check-prices
   └→ 全商品のマージン確認
   └→ レポート生成

2. 問題商品特定
   └→ マージン38%未満を検出
   └→ 例: 85商品が要調整

3. バッチ更新（レート制限対応）
   └→ POST /api/update-all-shops-prices
   └→ offset/limit で分割実行
   └→ 8商品ずつ処理（90req/分以下）
   └→ 自動リトライ機能で429エラー回避

4. 結果確認
   └→ Vercelログで成功/失敗を確認
   └→ 構造化ログで詳細分析

5. 完了
   └→ 全506商品が適正価格（38%マージン）に！
   └→ 所要時間: 約8-10分
```

### シナリオ3: テスト駆動開発
```
1. 新機能追加前にテスト実行
   └→ npm test
   └→ 既存13テストが全てパス

2. 新しいAPI開発
   └→ ロガー統合（lib/logger.js使用）
   └→ レート制限対応（lib/rate-limiter.js使用）

3. テスト追加
   └→ tests/api/new-api.test.js作成
   └→ npm run test:watch で開発

4. デプロイ
   └→ git push
   └→ Vercel自動デプロイ
   └→ 本番環境でテスト

5. 監視
   └→ Vercelログで構造化ログ確認
   └→ エラー発生時は詳細情報を取得
   └→ レート制限状況をチェック
```

---

## ⚠️ 制限事項

### Printify API制限
- ❌ **モックアップ選択不可**: 手動選択 or マスター商品Duplicate
- ❌ **サイズ表チェック不可**: 手動設定必要
- ❌ **パーソナライゼーション設定不可**: 販売チャネル固有のみ可能

### SUZURI制限
- ❌ **トリブン（利益マージン）設定不可**: 管理画面で手動設定必須
- ✅ **レート制限**: 5req/分（自動管理済み）

### Vercel制限
- **API Payload**: 4.5MB（画像圧縮で対応済み）
- **関数実行時間**: 最大10秒
- **ファイルシステム**: 読み取り専用

### Gemini API制限
- **無料枠**: 500リクエスト/日、15,000リクエスト/月
- **画像生成**: 不安定（プレビュー版）
  - 対策: FAL AIを推奨、リトライ機能実装済み

---

## 📚 ドキュメント一覧

### 利用者向け
- [README.md](README.md) - プロジェクト概要・セットアップ
- [SUZURI-SETUP-GUIDE.md](SUZURI-SETUP-GUIDE.md) - SUZURI 61商品タイプ詳細
- [PRICING_SYSTEM.md](PRICING_SYSTEM.md) - 価格管理システム完全ガイド
- [PROJECT_STATUS.md](PROJECT_STATUS.md) - プロジェクト状態・最終テスト結果

### 開発者向け
- [IMPROVEMENT_REPORT.md](IMPROVEMENT_REPORT.md) - v1.1.0改善レポート
- [TESTING_STATUS.md](TESTING_STATUS.md) - テスト実装状況
- [LOGGER_INTEGRATION_GUIDE.md](LOGGER_INTEGRATION_GUIDE.md) - ロガー統合手順
- [tests/README.md](tests/README.md) - テスト実行方法
- [SYSTEM_CAPABILITIES.md](SYSTEM_CAPABILITIES.md) - このファイル

### ワークフロー
- [PRINTIFY_WORKFLOW_GUIDE.md](PRINTIFY_WORKFLOW_GUIDE.md) - Printify作業手順
- [PRODUCTION_STRATEGY.md](PRODUCTION_STRATEGY.md) - 商品戦略
- [PRODUCT_LISTING_STANDARDS.md](PRODUCT_LISTING_STANDARDS.md) - 出品基準

---

## 🎉 まとめ

### システムの特徴
✅ **完全自動化**: デザイン生成から出品まで自動
✅ **多販路対応**: Printify、SUZURI、Etsy、eBay
✅ **高品質**: AIで多様なデザイン、38%マージン維持
✅ **低コスト**: 月$0〜$15で運用可能
✅ **大量生産**: 最大512商品/回
✅ **品質保証**: テスト・ログ・レート制限完備（v1.1.0）

### できること（要約）
1. ✅ AIで日本文化デザイン自動生成（50+テーマ）
2. ✅ Printify 24商品/回自動出品（価格・EU対応自動）
3. ✅ SUZURI 61商品タイプ一括出品
4. ✅ Etsy・eBay マルチプラットフォーム対応
5. ✅ 全506商品の価格自動管理（38%マージン）
6. ✅ テスト13件、構造化ログ、レート制限管理
7. ✅ 月$0〜$15で運用可能
8. ✅ 最大512商品/回の大量生産能力

### 使用中のAIモデル
- **Gemini 2.0 Flash Experimental**: アイデア生成、SNS投稿文
- **Gemini 2.5 Flash Image Preview**: 画像生成（メイン）
- **FAL AI Seedream 4.0**: 画像生成（代替、推奨）

---

**システム状態**: 本番稼働中 🚀
**バージョン**: v1.1.0（2025-10-10改善版）
**本番URL**: https://design-generator-puce.vercel.app

---

**作成日**: 2025-10-10
**次回更新**: 新機能追加時
