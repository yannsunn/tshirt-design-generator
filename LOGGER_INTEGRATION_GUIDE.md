# ロガー統合ガイド

## 📋 概要

既存APIを壊さず、段階的にエラーロギングを統合するためのガイドです。

## 🎯 方針

### ✅ 安全な統合
- **既存APIは変更しない**（health.js → health-v2.js のように新バージョン作成）
- **段階的に移行**（一度に全て変更しない）
- **テストで動作確認**してから本番適用

## 📦 ロガーの機能

### 1. 構造化ログ
```javascript
import { createLogger } from '../lib/logger.js';

const logger = createLogger('api-name');

// INFOログ
logger.info('Operation completed', { userId: 123, count: 5 });

// WARNログ
logger.warn('Rate limit approaching', { remaining: 10 });

// ERRORログ
try {
  // 処理
} catch (error) {
  logger.error('Operation failed', error, { context: 'additional info' });
}
```

### 2. API呼び出しログ
```javascript
logger.apiCall('POST', '/api/external', 1234, 200, { size: '5MB' });
```

### 3. パフォーマンス計測
```javascript
const timer = logger.startTimer('database-query');

// 処理...

timer.end({ rows: 100 }); // 自動的に経過時間をログ
```

### 4. レスポンスヘルパー
```javascript
import { createSuccessResponse, createErrorResponse } from '../lib/logger.js';

// 成功レスポンス
res.json(createSuccessResponse({ id: 1, name: 'Product' }));

// エラーレスポンス
res.status(500).json(createErrorResponse(logger, error));
```

## 🔧 既存APIへの統合例

### Before（既存コード）
```javascript
// api/example.js
export default async function handler(req, res) {
  try {
    const result = await doSomething();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### After（ロガー統合版）
```javascript
// api/example-v2.js
import { createLogger, createSuccessResponse, createErrorResponse } from '../lib/logger.js';

const logger = createLogger('example-v2');

export default async function handler(req, res) {
  const timer = logger.startTimer('example-handler');

  try {
    logger.info('Request received', {
      method: req.method,
      query: req.query
    });

    const result = await doSomething();

    logger.info('Operation completed', { resultSize: result.length });

    const duration = timer.end();

    res.status(200).json(
      createSuccessResponse(result, { responseTime: `${duration}ms` })
    );
  } catch (error) {
    timer.end();
    res.status(500).json(createErrorResponse(logger, error));
  }
}
```

## 📝 統合の手順

### Step 1: 新バージョンAPI作成
```bash
# 既存APIをコピー
cp api/example.js api/example-v2.js

# ロガーを統合
# （上記の After パターンを参考に修正）
```

### Step 2: テスト作成
```javascript
// tests/api/example-v2.test.js
describe('Example API v2', () => {
  it('should log structured messages', async () => {
    const response = await fetch(`${API_BASE}/api/example-v2`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('success');
    expect(data.data).toBeDefined();
  });
});
```

### Step 3: ローカルテスト
```bash
npm test example-v2
```

### Step 4: デプロイ
```bash
git add api/example-v2.js tests/api/example-v2.test.js
git commit -m "feat: Add logging to example API (v2)"
git push
```

### Step 5: 動作確認
```bash
# Vercelログで構造化ログを確認
curl https://design-generator-puce.vercel.app/api/example-v2
```

### Step 6: 切り替え（オプション）
動作確認後、既存APIをロガー統合版に置き換え可能：
```bash
mv api/example.js api/example.old.js
mv api/example-v2.js api/example.js
```

## 🎯 優先順位

### 高優先度（すぐに統合）
1. ✅ `health.js` → `health-v2.js` （完了）
2. `generate-ideas.js` → `generate-ideas-v2.js`
3. `printify-create-product.js` → `printify-create-product-v3.js`

### 中優先度
4. `printify-update-prices.js` → `printify-update-prices-v2.js`
5. `suzuri-batch-create.js` → `suzuri-batch-create-v2.js`

### 低優先度
6. その他のAPI（段階的に統合）

## 📊 ログの確認方法

### Vercelダッシュボード
1. https://vercel.com/あなたのプロジェクト にアクセス
2. Logs タブを開く
3. JSON形式のログを確認

### フィルタリング例
```bash
# エラーのみ
grep '"level":"error"' logs.json

# 特定のコンテキスト
grep '"context":"generate-ideas-v2"' logs.json

# 遅いリクエスト（1秒以上）
grep '"duration":[0-9][0-9][0-9][0-9]' logs.json
```

## ⚠️ 注意事項

### 機密情報の扱い
```javascript
// ❌ NG: APIキーをログに含める
logger.info('API call', { apiKey: process.env.SECRET_KEY });

// ✅ OK: 機密情報を除外
logger.info('API call', {
  hasApiKey: !!process.env.SECRET_KEY,
  keyLength: process.env.SECRET_KEY?.length
});
```

### 大きなオブジェクト
```javascript
// ❌ NG: 大きなレスポンスをそのままログ
logger.info('Response received', { response: hugeObject });

// ✅ OK: サマリーのみ
logger.info('Response received', {
  size: JSON.stringify(hugeObject).length,
  itemCount: hugeObject.items?.length
});
```

### パフォーマンス
```javascript
// ログは軽量だが、過度な使用は避ける
for (let i = 0; i < 10000; i++) {
  logger.debug(`Processing item ${i}`); // ❌ ループ内は避ける
}

// ✅ バッチでログ
logger.info('Batch processing completed', { count: 10000 });
```

## 🧪 テスト例

```javascript
import { createLogger } from '../lib/logger.js';

describe('Logger Integration', () => {
  it('should not break existing functionality', async () => {
    const logger = createLogger('test');

    // 既存の処理
    const result = await existingFunction();

    // ログ追加（既存処理に影響なし）
    logger.info('Test completed', { result });

    expect(result).toBeDefined();
  });
});
```

## 📈 期待される効果

### Before（既存）
```
Error: Something went wrong
    at /api/example.js:42:15
```

### After（ロガー統合）
```json
{
  "timestamp": "2025-10-10T12:34:56.789Z",
  "level": "error",
  "context": "example-v2",
  "message": "Request failed",
  "error": {
    "message": "Something went wrong",
    "name": "Error",
    "stack": "..."
  },
  "statusCode": 500,
  "method": "POST",
  "url": "/api/example",
  "userId": "user123",
  "environment": "production"
}
```

**メリット**:
- エラーの原因が特定しやすい
- ユーザーコンテキストがわかる
- パフォーマンス問題を検出
- 統計分析が可能

## 🚀 次のステップ

1. ✅ `health-v2.js` で動作確認
2. 他の重要APIに段階的に統合
3. Vercelログでエラーパターンを分析
4. 必要に応じて外部監視サービス（Sentry等）統合

---

**作成日**: 2025-10-10
**ステータス**: Phase 2 進行中
**次回**: Phase 3 レート制限の統一管理
