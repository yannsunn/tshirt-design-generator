# 🇯🇵 日本国内PODサービス連携セットアップガイド

## 📋 概要

このシステムでは、以下の日本国内PODサービスとAPI連携が可能です：

1. **SUZURI（スズリ）** - 自動化可能
2. **BASE** - 自動化可能（手動設定も推奨）

---

## 🎯 SUZURI API連携

### ステップ1: SUZURIアカウント作成

1. https://suzuri.jp/ にアクセス
2. 「クリエイター登録」をクリック
3. アカウントを作成

### ステップ2: SUZURI OAuth アプリケーション作成

1. https://suzuri.jp/developer にアクセス
2. 「新しいアプリケーション」をクリック
3. 以下の情報を入力：
   - **アプリケーション名**: `Tシャツデザイン自動生成`
   - **リダイレクトURI**: `https://design-generator-puce.vercel.app/api/suzuri-auth-callback`
   - **スコープ**: `read`, `write`を選択

4. 「作成」をクリック

### ステップ3: 認証情報を取得

1. 作成したアプリケーションの詳細ページで以下を確認：
   - **Client ID**
   - **Client Secret**

2. OAuth認証フローを実行してアクセストークンを取得

### ステップ4: 環境変数を設定

`.env`ファイルに以下を追加：

```bash
# SUZURI API
SUZURI_CLIENT_ID=your_client_id_here
SUZURI_CLIENT_SECRET=your_client_secret_here
SUZURI_ACCESS_TOKEN=your_access_token_here
SUZURI_REFRESH_TOKEN=your_refresh_token_here
```

### ステップ5: Vercel環境変数を設定

```bash
vercel env add SUZURI_ACCESS_TOKEN
# プロンプトでトークンを入力
```

---

## 🛒 BASE API連携

### ステップ1: BASEアカウント作成

1. https://thebase.com/ にアクセス
2. 「無料でネットショップを開く」をクリック
3. ショップ情報を入力して作成

### ステップ2: BASE Developers登録

1. https://developers.thebase.com/ にアクセス
2. 「開発者登録」をクリック
3. アプリケーション情報を入力：
   - **アプリケーション名**: `Tシャツデザイン自動生成`
   - **リダイレクトURI**: `https://design-generator-puce.vercel.app/api/base-auth-callback`
   - **スコープ**: `read_items`, `write_items`を選択

### ステップ3: OAuth認証

1. Client IDとClient Secretを取得
2. OAuth認証フローを実行してアクセストークンを取得

### ステップ4: 環境変数を設定

`.env`ファイルに以下を追加：

```bash
# BASE API
BASE_CLIENT_ID=your_client_id_here
BASE_CLIENT_SECRET=your_client_secret_here
BASE_ACCESS_TOKEN=your_access_token_here
BASE_REFRESH_TOKEN=your_refresh_token_here
```

### ステップ5: オリジナルプリント.jpアプリをインストール

1. BASEダッシュボードにログイン
2. 「Apps」→「オリジナルプリント.jp」を検索
3. インストールをクリック
4. 連携を完了

---

## 🚀 使い方

### SUZURI商品を自動作成

```bash
# フロントエンドから実行
1. デザインを生成
2. 「SUZURIに出品」ボタンをクリック
3. 自動的にTシャツ・パーカー・スウェットが作成されます
```

### BASE商品を作成

```bash
# オプション1: API経由（自動）
1. デザインを生成
2. 「BASEに出品」ボタンをクリック

# オプション2: 手動（推奨 - より高い利益率）
1. BASEダッシュボードにログイン
2. オリジナルプリント.jpアプリを開く
3. デザイン画像をアップロード
4. 商品タイプ・価格を設定
5. 公開
```

---

## 💰 価格設定の推奨

### SUZURI
- 自動計算（SUZURI側で決定）
- クリエイター利益: 販売価格の20-30%

### BASE + オリジナルプリント.jp

| 商品タイプ | 原価 | 推奨販売価格 | 利益率 |
|-----------|------|------------|--------|
| Tシャツ (Gildan 5000) | ¥900 | ¥2,500 | 64% |
| パーカー (Gildan 18500) | ¥2,550 | ¥4,500 | 43% |
| スウェット (Gildan 18000) | ¥2,100 | ¥3,800 | 45% |

---

## 📊 API制限

### SUZURI API
- レート制限: 1リクエスト/秒程度（明示的な制限なし）
- 画像サイズ: 最大10MB

### BASE API
- **重要**: 1日あたり1000商品まで作成可能
- レート制限: 明示的な制限なし（推奨: 10req/分）

---

## 🔧 トラブルシューティング

### SUZURI: "Unauthorized" エラー

**原因**: アクセストークンが無効または期限切れ

**解決方法**:
1. OAuth認証フローを再実行
2. 新しいアクセストークンを取得
3. 環境変数を更新

### BASE: "Forbidden" エラー

**原因**: スコープが不足している

**解決方法**:
1. BASE Developersで`write_items`スコープを確認
2. 再認証を実行

---

## 🎯 次のステップ

1. ✅ SUZURI OAuth認証を完了
2. ✅ BASE OAuth認証を完了
3. ✅ 環境変数をVercelに設定
4. ✅ フロントエンドから商品作成をテスト

---

## 📞 サポート

- SUZURI API: https://suzuri.jp/developer/documentation/v1
- BASE API: https://docs.thebase.in/api/
