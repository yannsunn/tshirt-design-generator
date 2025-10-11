# テストガイド

## 📋 概要

このディレクトリには、既存システムを壊さずに品質を保証するためのテストが含まれています。

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

テスト実行前に `.env` ファイルを設定してください：

```bash
# 必須
GEMINI_API_KEY=your_key_here
PRINTIFY_API_KEY=your_key_here
SUPABASE_URL=your_url_here
SUPABASE_ANON_KEY=your_key_here

# オプション
VERCEL_URL=design-generator-puce.vercel.app
```

## 🧪 テスト実行

### 全テスト実行

```bash
npm test
```

### テスト監視モード（開発中）

```bash
npm run test:watch
```

### カバレッジレポート生成

```bash
npm run test:coverage
```

## 📁 テスト構成

```
tests/
├── setup.js                    # テスト環境セットアップ
├── api/
│   ├── health.test.js         # ヘルスチェックAPI
│   ├── generate-ideas.test.js # アイデア生成API
│   └── printify.test.js       # Printify API
└── README.md                   # このファイル
```

## 🎯 テストカバレッジ目標

| カテゴリ | 目標 | 現状 |
|---------|------|------|
| API エンドポイント | 80% | 🟡 進行中 |
| エラーハンドリング | 70% | 🟡 進行中 |
| 統合テスト | 60% | 🟡 進行中 |

## 📝 テスト作成ガイドライン

### 1. 既存コードを変更しない

テストは**観測のみ**を行い、既存のAPIやデータベースを変更しません。

### 2. レート制限を考慮

```javascript
await helpers.waitForRateLimit(1000); // 1秒待機
```

### 3. テストデータの命名規則

```javascript
const testTheme = `テスト_${Date.now()}`; // タイムスタンプで一意性確保
```

### 4. タイムアウト設定

外部API呼び出しは30秒のタイムアウトを設定：

```javascript
it('should call external API', async () => {
  // テスト内容
}, global.testTimeout);
```

## 🐛 トラブルシューティング

### テストが失敗する

1. **環境変数を確認**
   ```bash
   cat .env
   ```

2. **API キーの有効性を確認**
   ```bash
   curl https://design-generator-puce.vercel.app/api/health
   ```

3. **レート制限エラー**
   - テストの並列実行を無効化（`jest.config.js`で設定済み）
   - テスト間の待機時間を増やす

### カバレッジが低い

現状は基本的なテストのみ実装しています。段階的に追加予定です。

## 🔄 CI/CD統合（今後）

GitHub Actionsでの自動テスト実行を予定：

```yaml
# .github/workflows/test.yml
name: Run Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
```

## 📈 進捗状況

- ✅ Phase 1-1: テスト基盤構築完了
- 🟡 Phase 1-2: API統合テスト（進行中）
- ⬜ Phase 1-3: E2Eテスト（未着手）

## 🤝 貢献

テストケースの追加・改善は大歓迎です。

1. 新しいテストファイルを `tests/api/` に追加
2. テスト実行で動作確認
3. コミット・プッシュ

## 📚 参考資料

- [Jest公式ドキュメント](https://jestjs.io/ja/)
- [プロジェクトREADME](../README.md)
- [API仕様書](../PRINTIFY_WORKFLOW_GUIDE.md)
