# セットアップガイド

## 前提条件

- Node.js 18以上
- Git
- Printify API Key
- Vercelアカウント（デプロイ用）
- GitHubアカウント（GitHub Actions用）

## 環境変数の設定

### ローカル開発

`.env.local` ファイルを作成:

```bash
# Printify API
PRINTIFY_API_KEY=your_printify_api_key_here

# Supabase (オプション)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Vercel

Vercelダッシュボードで設定:

1. プロジェクト設定 → Environment Variables
2. 以下を追加:
   - `PRINTIFY_API_KEY` = あなたのPrintify APIキー

### GitHub Secrets（GitHub Actions用）

リポジトリ設定で追加:

1. Settings → Secrets and variables → Actions
2. New repository secret:
   - `PRINTIFY_API_KEY` = あなたのPrintify APIキー
   - `VERCEL_URL` = `design-generator-puce.vercel.app` （あなたのVercel URL）

## インストール

```bash
# 依存関係をインストール
npm install

# 価格チェックスクリプトをテスト
npm run pricing:check
```

## デプロイ

### Vercelへのデプロイ

```bash
# Vercel CLIをインストール（初回のみ）
npm i -g vercel

# デプロイ
vercel

# 本番環境へデプロイ
vercel --prod
```

### 自動デプロイ

GitHubリポジトリにpushすると自動的にVercelへデプロイされます。

## GitHub Actionsの有効化

`.github/workflows/pricing-check.yml` がすでに存在するため、自動実行が有効です。

### 動作確認

1. GitHub リポジトリ → Actions タブ
2. "Auto Pricing Check" ワークフローを確認
3. "Run workflow" で手動実行可能

### スケジュール

- 毎日午前9時（UTC）= 日本時間 午後6時 に自動実行
- `--analyze` モードで実行（修正なし）
- `--auto-fix` は手動実行時のみ

## 使用方法

### 価格チェック（分析のみ）

```bash
npm run pricing:check
```

### 自動修正

```bash
npm run pricing:fix
```

### API経由での更新

#### 単一商品

```bash
curl -X POST https://design-generator-puce.vercel.app/api/printify-update-single-product \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "24566516",
    "productId": "abc123",
    "targetMargin": 38
  }'
```

#### バッチ更新

```bash
curl -X POST https://design-generator-puce.vercel.app/api/batch-update-products \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {"shopId": "24566516", "productId": "abc123"},
      {"shopId": "24566474", "productId": "def456"}
    ],
    "targetMargin": 38
  }'
```

## ログの確認

### Vercel環境

Vercelダッシュボード → Logs で確認

### ローカル環境

```bash
# エラーログ
cat pricing-reports/error-log.json

# 価格変更ログ
cat pricing-reports/pricing-change-log.json

# 分析レポート
ls pricing-reports/pricing-analysis-*.json
```

### GitHub Actions環境

GitHub → Actions → ワークフロー実行 → ログを確認

## トラブルシューティング

### Printify API接続エラー

```
Error: Unauthenticated
```

**解決方法:**
1. `PRINTIFY_API_KEY` が正しく設定されているか確認
2. Vercel環境変数を再確認
3. APIキーの有効期限を確認

### レート制限エラー

```
Error Code: 429 - Too Many Requests
```

**解決方法:**
- `limit` パラメータを減らす（推奨: 8以下）
- リトライ間隔を長くする

### GitHub Actions失敗

**確認項目:**
1. GitHub Secrets が正しく設定されているか
2. `PRINTIFY_API_KEY` の値が正しいか
3. ワークフローログでエラー詳細を確認

### ファイルが見つからない

```
Error: Cannot find module '../lib/pricingLogger.js'
```

**解決方法:**
1. `git pull` で最新コードを取得
2. `npm install` を再実行
3. Vercelに再デプロイ

## 開発者向け

### 新しいBlueprintの追加

`api/*-update-*.js` ファイルの `blueprintCosts` に追加:

```javascript
const blueprintCosts = {
    // ...既存のエントリ
    999: {
        baseCost: 1500,
        extraCost: { '2XL': 1800, '3XL': 2100 },
        name: 'New Blueprint Name'
    }
};
```

### ログシステムのカスタマイズ

`lib/pricingLogger.js` を編集してログ形式を変更できます。

### テスト

```bash
# APIヘルスチェック
curl https://design-generator-puce.vercel.app/api/health

# 価格分析テスト
npm run pricing:check
```

## サポート

問題が発生した場合:
1. このドキュメントを確認
2. `PRICING_SYSTEM.md` でシステム詳細を確認
3. GitHub Issues で報告

## セキュリティ

- APIキーは **絶対に** コミットしない
- `.env.local` は `.gitignore` に含まれている
- GitHub Secretsを使用して機密情報を管理
