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
| **Supabase** | アイデア履歴保存（重複防止） | 無料枠500MB | https://supabase.com/dashboard |
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
| `SUPABASE_URL` | ⭕ | Supabase Project URL（重複防止） |
| `SUPABASE_ANON_KEY` | ⭕ | Supabase Anon Key（重複防止） |
| `REMOVEBG_API_KEY` | ⭕ | remove.bg（高精度背景除去） |
| `PRINTIFY_API_KEY` | ⭕ | Printify（商品登録） |

**重要**: 環境変数設定後、必ず **Redeploy** を実行してください。

#### Supabaseセットアップ（重複防止機能）

Supabaseを設定すると、過去に生成したアイデアを記録し、同じモチーフ・フレーズの重複を防ぎます。

1. **プロジェクト作成**
   - https://supabase.com/dashboard にアクセス
   - "New Project" をクリック
   - プロジェクト名を入力（例: tshirt-ideas）

2. **テーブル作成**
   - SQL Editor を開く
   - 以下のSQLを実行:
   ```sql
   CREATE TABLE design_ideas (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     theme TEXT NOT NULL,
     character TEXT NOT NULL,
     phrase TEXT NOT NULL,
     font_style TEXT NOT NULL
   );

   CREATE INDEX idx_design_ideas_theme ON design_ideas(theme);
   CREATE INDEX idx_design_ideas_created_at ON design_ideas(created_at DESC);
   ```

3. **環境変数を取得**
   - Settings → API
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - Vercelの環境変数に設定

4. **動作確認**
   - アイデア生成後、コンソールに「✅ 4件のアイデアを履歴に保存しました」と表示されればOK
   - 2回目以降は過去のフレーズ・モチーフを避けた新しいアイデアが生成されます

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
├── public/                       # 静的ファイル
│   ├── index.html                # メインアプリケーション
│   └── favicon.svg               # ファビコン
├── IMAGE_GENERATION_RULES.md    # 🎨 画像生成ルール（必読）
├── TESTING_GUIDE.md             # 🧪 テストガイド
├── vercel.json                  # Vercel設定
├── .env.example                 # 環境変数テンプレート
├── .gitignore                   # Git除外設定
├── package.json                 # Node.js設定
└── README.md                    # このファイル
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

### Printify商品作成のベストプラクティス

商品作成後、以下の手順で最適化することを推奨します：

1. **モックアップの追加**
   - Printifyダッシュボードで商品を開く
   - 「Edit design」をクリック
   - 「View all mockups」をクリック
   - 50+種類のモックアップから選択（様々な角度・色・モデル）
   - 推奨: 最低10-15種類のモックアップを選択

2. **デザイン位置の微調整**
   - Y軸: 0.45（少し上に配置すると見栄えが良い）
   - スケール: 0.95（余裕を持たせて見切れを防ぐ）

3. **背景について**
   - **remove.bg APIキーあり**: 自動で透明背景になります（99%精度）
   - **remove.bg APIキーなし**: 白背景のまま生成されます
     - Printifyが自動で背景を透明化（80-90%精度）
     - 手動で調整が必要な場合があります
   - **推奨**: remove.bg APIキーを設定（月50枚無料）

4. **品質チェック**
   - 各モックアップでデザインが見切れていないか確認
   - 背景が正しく透明化されているか確認
   - 必要に応じてデザイン位置・スケールを調整

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

## 📚 重要ドキュメント

### **必読ドキュメント**
- 📄 **[IMAGE_GENERATION_RULES.md](./IMAGE_GENERATION_RULES.md)** - 画像生成の完全ルール
  - キャラクターとテーマの一致ルール
  - 品質パラメータ設定
  - トラブルシューティング

- 🧪 **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - テストガイド
  - 10個のテストケース
  - テスト手順
  - 成功基準

### **開発者向け**
- 🔧 **[.env.example](./.env.example)** - 環境変数テンプレート
- 📦 **[package.json](./package.json)** - Node.js設定
- ⚙️ **[vercel.json](./vercel.json)** - Vercel設定

---

**作成日**: 2025-09-30
**最終更新**: 2025-10-02
**バージョン**: 2.0.0
