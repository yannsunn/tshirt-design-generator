# 🎨 Japan Souvenir T-Shirt Generator

外国人観光客向けの日本文化Tシャツデザインを自動生成するWebアプリケーション

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📖 概要

AIを活用して、日本の伝統文化・現代文化をテーマにしたTシャツデザインを自動生成します。
- 50+の日本テーマから選択
- AI画像生成（FAL AI / Gemini）
- 自動背景除去（remove.bg）
- Printify自動商品登録

**本番環境**: https://design-generator-puce.vercel.app

---

## ✨ 主な機能

### 🎯 テーマ選択
8カテゴリー、50+テーマ:
- 🏯 日本の伝統文化（富士山、侍、忍者、芸者...）
- 🐾 日本の動物（柴犬、招き猫、鯉...）
- 🍱 日本料理（寿司、ラーメン、抹茶...）
- ⛩️ 日本の風景（鳥居、竹林、温泉...）
- 🎉 季節のイベント（花見、夏祭り、花火...）
- 🚄 現代日本（新幹線、渋谷、東京タワー...）
- 🎎 日本の象徴（だるま、折り紙、扇子...）
- 🎃 国際イベント（和風ハロウィン、和風クリスマス...）

### 🤖 AI自動生成
1. **デザインアイデア生成**（Gemini 2.0 Flash）
   - 3つのユニークなコンセプト
   - 詳細なモチーフ描写（日本語）
   - ひらがなメインのキャッチフレーズ

2. **画像生成**（FAL AI / Gemini）
   - 高品質4500x5400px
   - 日本文化に特化したプロンプト
   - 白背景で生成

3. **背景除去**（オプション）
   - remove.bg API（99%精度）
   - またはPrintify自動処理（80-90%精度）

4. **テキスト合成**
   - 日本語フォント最適化
   - 自動サイズ調整（はみ出し防止）
   - 影付き・縁取りで視認性向上

### 📱 SNS投稿文生成
商品説明・ハッシュタグを自動生成

### 🛒 Printify連携
ワンクリックで商品登録・画像アップロード

---

## 🚀 セットアップ

### 前提条件
- Vercelアカウント
- 各種APIキー（下記参照）

### 1️⃣ リポジトリをクローン
```bash
git clone https://github.com/yannsunn/tshirt-design-generator.git
cd tshirt-design-generator
```

### 2️⃣ APIキーを取得

#### 必須
| サービス | 用途 | 料金 | 取得先 |
|---------|------|------|--------|
| **Gemini API** | アイデア生成 | 無料 | https://aistudio.google.com/apikey |
| **FAL API** | 画像生成 | $0.05/画像 | https://fal.ai/dashboard/keys |

#### オプション
| サービス | 用途 | 料金 | 取得先 |
|---------|------|------|--------|
| **remove.bg API** | 背景除去 | 月50枚無料、以降$0.20/枚 | https://www.remove.bg/api |
| **Printify API** | 商品登録 | 無料 | https://printify.com/app/account/api |

### 3️⃣ Vercelにデプロイ

#### オプションA: ワンクリックデプロイ
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

#### オプションB: CLI
```bash
npm install -g vercel
vercel
```

### 4️⃣ 環境変数を設定

Vercelダッシュボード → Settings → Environment Variables

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `GEMINI_API_KEY` | ✅ | Gemini API（アイデア生成・代替画像生成） |
| `FAL_API_KEY` | ✅ | FAL AI（メイン画像生成） |
| `REMOVEBG_API_KEY` | ⭕ | remove.bg（高精度背景除去） |
| `PRINTIFY_API_KEY` | ⭕ | Printify（商品登録） |

**重要**: 環境変数設定後、必ず **Redeploy** を実行してください。

---

## 💰 コスト試算

### 月100商品（300アイデア生成）の場合

#### パターンA: 完全無料
| 項目 | コスト |
|------|--------|
| アイデア生成（Gemini無料枠） | $0 |
| 画像生成（Gemini無料枠） | $0 |
| 背景除去（Printify自動） | $0 |
| **合計** | **$0/月** |

> Gemini無料枠: 500リクエスト/日（15,000/月）→ 月100商品は余裕

#### パターンB: 高品質（推奨）
| 項目 | コスト |
|------|--------|
| アイデア生成（Gemini無料枠） | $0 |
| 画像生成（FAL AI $0.05×100） | $5 |
| 背景除去（remove.bg 50枚無料 + $0.20×50） | $10 |
| **合計** | **$15/月** |

---

## 📁 プロジェクト構成

```
tshirt-design-generator/
├── api/                          # Vercel Serverless Functions
│   ├── generate-ideas.js         # アイデア生成（Gemini 2.0 Flash）
│   ├── generate-image.js         # 画像生成（FAL AI / Gemini 2.5 Flash Image）
│   ├── remove-background.js      # 背景除去（remove.bg API）
│   ├── generate-sns.js           # SNS投稿文生成（Gemini）
│   ├── printify-upload-image.js  # Printify画像アップロード
│   ├── printify-create-product.js# Printify商品作成
│   ├── printify-get-shops.js     # Printifyショップ取得
│   └── health.js                 # ヘルスチェック
├── index.html                    # メインアプリケーション
├── vercel.json                   # Vercel設定
├── .env.example                  # 環境変数テンプレート
├── .gitignore                    # Git除外設定
└── README.md                     # このファイル
```

---

## 🔧 技術スタック

### フロントエンド
- **HTML5 + Vanilla JavaScript**: シンプルで高速
- **Tailwind CSS CDN**: ユーティリティファーストCSS
- **Canvas API**: 画像合成・テキスト描画
- **Google Fonts**: 日本語フォント（Zen Maru Gothic、Shippori Mincho B1など）

### バックエンド
- **Vercel Serverless Functions**: Node.js 18+
- **Gemini 2.0 Flash**: アイデア生成（無料）
- **FAL AI FLUX Dev**: 高品質画像生成（$0.05/画像）
- **Gemini 2.5 Flash Image**: 代替画像生成（$0.039/画像、不安定）
- **remove.bg API**: 高精度背景除去（月50枚無料）
- **Printify API**: オンデマンド印刷連携

### インフラ
- **Vercel**: ホスティング・デプロイ・環境変数管理
- **GitHub**: バージョン管理

---

## 🎨 使い方

### 基本フロー

1. **画像生成API選択**
   - FAL AI（推奨）: 高品質・安定
   - Gemini: 無料だが不安定

2. **テーマ選択**
   - 50+のテーマボタンから選択
   - 例：「🗻 富士山と桜」「🥷 忍者」「🍣 寿司」

3. **アイデア生成**
   - 「アイディアを生成」ボタンをクリック
   - AIが3つのコンセプトを提案（モチーフ・フレーズ・フォント）

4. **画像生成**
   - 好きなアイデアを選択
   - 自動で以下を実行：
     1. キャラクター画像生成（白背景）
     2. 背景除去（remove.bg or Printify）
     3. テキスト合成

5. **ダウンロード or Printify登録**
   - 「デザインをダウンロード」: PNG保存
   - 「SNS投稿文を生成」: 商品説明生成
   - 「Printifyで商品作成」: 自動登録

### フォントスタイル（自動選択）

| スタイル | フォント | 用途 |
|---------|----------|------|
| **pop** | Zen Maru Gothic | 可愛い・カジュアル |
| **horror** | Shippori Mincho B1 | 怖い・重厚 |
| **retro** | Rampart One | 昭和レトロ・ポップ |
| **modern** | Zen Kaku Gothic New | モダン・クール |

---

## 🐛 トラブルシューティング

### 「画像データが見つかりません」エラー
**原因**: Gemini 2.5 Flash Image APIが不安定（プレビュー版）

**解決策**:
1. 画像生成APIで **FAL AI** を選択
2. FAL AIはデフォルトで選択されています

### 「サーバーに接続できません」
**原因**: APIキーが未設定または無効

**解決策**:
1. Vercelダッシュボード → Settings → Environment Variables で確認
2. APIキーが正しいか確認
3. 再度 **Redeploy** を実行

### テキストがはみ出る
**解決済み**: 自動調整機能実装済み

もし問題が発生したら再生成してください。

### 背景が透明にならない
**原因**: remove.bg APIキー未設定

**解決策**:
1. **オプションA**: remove.bg APIキーを設定（月50枚無料）
   - https://www.remove.bg/api でAPIキー取得
   - Vercelで `REMOVEBG_API_KEY` を設定
   - Redeploy

2. **オプションB**: Printifyの自動処理に任せる
   - 白背景のままアップロード
   - Printifyが自動で透明化（精度80-90%）

### 処理が遅い
**正常**: 画像生成は15-20秒かかります
- アイデア生成: 2-5秒
- 画像生成: 5-10秒
- 背景除去: 2-3秒
- テキスト合成: 1秒

---

## 🔐 セキュリティ

### 環境変数の管理
- ❌ `.env`ファイルはGitにコミットしない（.gitignoreで除外済み）
- ✅ Vercelダッシュボードで安全に管理
- ✅ クライアント側にAPIキーは一切露出しない

### APIキーの保護
- フロントエンドから直接API呼び出しなし
- Serverless Functionsでサーバーサイド処理
- ヘルスチェックでは存在確認のみ（値は返さない）

---

## 📈 パフォーマンス

### 画像サイズ
- **4500x5400px** (Printify推奨サイズ)
- 高解像度でプリント品質を保証

### レスポンス時間
| 処理 | 時間 |
|------|------|
| アイデア生成 | 2-5秒 |
| 画像生成（FAL AI） | 5-10秒 |
| 画像生成（Gemini） | 10-20秒 |
| 背景除去 | 2-3秒 |
| テキスト合成 | 1秒 |
| **合計** | **約15-20秒** |

---

## 🚧 既知の制限事項

1. **Gemini画像生成が不安定**
   - プレビュー版のため頻繁にエラー
   - FAL AIの使用を推奨

2. **大きなファイルサイズ**
   - 4500x5400pxのPNGは3-5MB
   - ダウンロードに時間がかかる場合あり

3. **Tailwind CSS CDN警告**
   - 開発者コンソールに警告が表示される
   - 機能に影響なし

4. **favicon 404エラー**
   - アイコンファイル未設定
   - 機能に影響なし

---

## 🛠️ 開発

### ローカル開発は不要

このプロジェクトはVercel Serverless Functionsを使用しているため、ローカル開発は基本的に不要です。

テストする場合:

```bash
# Vercel CLIをインストール
npm install -g vercel

# ローカルで起動
vercel dev
```

http://localhost:3000 でアクセス

---

## 📝 ライセンス

MIT License - 商用利用可能

---

## 🙏 謝辞

- [FAL AI](https://fal.ai/) - 高品質な画像生成
- [Google Gemini](https://ai.google.dev/) - アイデア生成・画像生成
- [remove.bg](https://www.remove.bg/) - 背景除去
- [Printify](https://printify.com/) - オンデマンド印刷
- [Vercel](https://vercel.com/) - ホスティング
- [Google Fonts](https://fonts.google.com/) - 日本語フォント

---

**作成日**: 2025-09-30
**最終更新**: 2025-10-01
**バージョン**: 1.0.0
