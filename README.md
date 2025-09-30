# 🎨 Tシャツデザインジェネレーター for Printify

AI を活用して、ユニークなTシャツデザインを自動生成するWebアプリケーションです。

## ✨ 機能

- **AIデザインアイディア生成** - テーマを入力するだけで3つのコンセプトを提案
- **AI画像生成** - FAL AI（メイン）または Gemini 2.5 Flash Image（代替）で高品質なキャラクターイラストを生成
- **自動背景除去** - 生成された画像の背景を自動的に透過処理
- **カラーバリエーション** - 白・黒・カラーTシャツ用の3種類を自動生成
- **SNS投稿文生成** - 商品説明とハッシュタグを自動作成
- **Printify連携準備完了** - 直接商品をアップロード可能（APIキー設定後）

## 🚀 Vercel へのデプロイ手順

### 1. GitHubリポジトリの作成

```bash
git init
git add .
git commit -m "Initial commit: T-shirt design generator"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tshirt-generator.git
git push -u origin main
```

### 2. Vercelでプロジェクトをインポート

1. [Vercel](https://vercel.com/) にログイン
2. **「New Project」** をクリック
3. GitHubリポジトリを選択してインポート
4. **「Deploy」** をクリック

### 3. 環境変数の設定

Vercelプロジェクトの **Settings → Environment Variables** で以下を追加：

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `GEMINI_API_KEY` | Google Gemini APIキー | ✅ |
| `FAL_API_KEY` | FAL AI APIキー | ✅ |
| `PRINTIFY_API_KEY` | Printify APIキー | ⚠️ (後で設定可) |

**環境変数追加後、必ず「Redeploy」してください。**

### 4. APIキーの取得方法

#### Gemini API
1. https://aistudio.google.com/apikey にアクセス
2. 「Create API Key」をクリック
3. 生成されたキーをコピー

#### FAL AI API
1. https://fal.ai/dashboard/keys にアクセス
2. 「Create Key」をクリック
3. 生成されたキーをコピー

#### Printify API
1. Printifyダッシュボードにログイン
2. Settings → API → Generate Token
3. 生成されたトークンをコピー

## 🛠 ローカル開発

### 必要環境
- Node.js 16以上
- npm または yarn

### セットアップ

```bash
# 依存パッケージのインストール
npm install

# .envファイルの作成
cp .env.example .env

# .envファイルを編集してAPIキーを設定
# GEMINI_API_KEY=your_key_here
# FAL_API_KEY=your_key_here
# PRINTIFY_API_KEY=your_key_here (オプション)

# 開発サーバーの起動
npm start
```

ブラウザで `http://localhost:3000/tshirt-generator.html` にアクセス

## 📁 プロジェクト構造

```
.
├── api/                          # Vercel Serverless Functions
│   ├── health.js                 # ヘルスチェック
│   ├── generate-ideas.js         # デザインアイディア生成
│   ├── generate-image.js         # AI画像生成（FAL/Gemini）
│   ├── generate-sns.js           # SNS投稿文生成
│   └── printify-create-product.js # Printify連携
├── tshirt-generator.html         # メインアプリケーション
├── server.js                     # ローカル開発用サーバー
├── vercel.json                   # Vercel設定
├── package.json                  # 依存関係
└── .env                          # 環境変数（Git除外済み）
```

## 🔒 セキュリティ

- ✅ APIキーは`.env`で管理され、GitHubにプッシュされません
- ✅ Vercelの環境変数機能で本番環境のAPIキーを安全に管理
- ✅ クライアント側にAPIキーは一切露出しません

## 📝 使い方

1. **テーマ入力** - 「ハロウィン」「クリスマス」など
2. **アイディア選択** - 3つの提案から1つを選択
3. **画像生成** - FAL AIまたはGeminiで画像を生成
4. **ダウンロード** - 透過PNG形式でダウンロード
5. **SNS投稿** - 自動生成された投稿文をコピー

## 🎯 Printify連携（準備中）

`PRINTIFY_API_KEY` を設定すると、以下の機能が有効になります：
- 生成したデザインをPrintifyに直接アップロード
- 商品タイトル・説明を自動設定
- Tシャツ商品を自動作成

詳細な実装は、Printify APIキー提供後に完成します。

## 🐛 トラブルシューティング

### サーバー接続エラー
- Vercelで環境変数が正しく設定されているか確認
- デプロイ後に「Redeploy」を実行

### 画像生成エラー
- FAL APIの利用制限を確認
- 代替として Gemini Image に切り替え

## 📄 ライセンス

MIT License

---

**開発者**: AI-Powered Design Tools
**更新日**: 2025年9月