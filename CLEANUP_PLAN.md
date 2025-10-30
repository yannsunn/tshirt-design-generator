# クリーンアップ計画

## 🗑️ 削除すべきファイル

### 1. 古いドキュメント（archive/docs-old/）- 全削除
```
archive/docs-old/CHANGELOG.md
archive/docs-old/COMPLETENESS_REVIEW.md
archive/docs-old/CRITICAL_FINDING.md
archive/docs-old/CURRENT_TASKS.md
archive/docs-old/EBAY_MASTER_PRODUCTS_SETUP.md
archive/docs-old/FINAL_OPTIMIZATION.md
archive/docs-old/IMPROVEMENT_REPORT.md
archive/docs-old/IMPROVEMENT_SUMMARY.md
archive/docs-old/LOGGER_INTEGRATION_GUIDE.md
archive/docs-old/PLATFORM_LINKS.md
archive/docs-old/PROJECT_STATUS.md
archive/docs-old/SYSTEM_CAPABILITIES.md
archive/docs-old/SYSTEM_REVIEW.md
archive/docs-old/TESTING_STATUS.md
archive/docs-old/UNPUBLISHED_PRODUCTS_GUIDE.md
```

### 2. 古いレポート（archive/reports/）- 全削除
```
archive/reports/etsy-tags-report-1760629441760.json
archive/reports/price-audit-report-1760629046480.json
archive/reports/price-fix-report-1760630915940.json
archive/reports/tags-check-report-1760629188465.json
```

### 3. 一時スクリプト（ルート）- 削除
```
check-masters-temp.js
check-old-master-ids.js
delete-non-masters.js
extract-master-prices.js
find-old-masters.js
fix-all-master-prices.js
verify-master-prices.js
```

### 4. 未使用API（api/）- 削除
```
api/auto-publish-ready-products.js (未使用)
api/auto-sync-prices.js (未使用)
api/batch-update-products.js (未使用)
api/check-master-products.js (未使用)
api/check-unpublished-products.js (未使用)
api/cleanup-idea-history.js (未使用)
api/cleanup-unpublishable-ideas.js (未使用)
api/create-from-master.js (未使用)
api/create-master-products.js (未使用)
api/create-masters-from-scratch.js (未使用)
api/delete-all-products.js (危険・未使用)
api/ebay-publish-products.js (eBay未使用)
api/fix-all-prices.js (未使用)
api/health-v2.js (重複)
api/list-master-products.js (未使用)
api/printify-calculate-optimal-prices.js (未使用)
api/printify-check-prices.js (未使用)
api/printify-check-stores.js (未使用)
api/printify-create-product-v2.js (重複)
api/printify-enable-express-batch.js (未使用)
api/printify-get-blueprints.js (未使用)
api/printify-get-blueprint-variants.js (未使用)
api/printify-get-mockups.js (未使用)
api/printify-get-shops.js (未使用)
api/printify-list-products.js (未使用)
api/printify-publish-products.js (未使用)
api/printify-update-prices-batch.js (重複)
api/printify-update-product-title.js (未使用)
api/printify-update-single-product.js (未使用)
api/publish-all-platforms.js (未使用)
api/rate-limit-status.js (未使用)
api/recreate-from-masters-batch.js (未使用)
api/recreate-masters-complete.js (未使用)
api/remove-background.js (未使用)
api/reset-processed-products.js (未使用)
api/save-ideas.js (未使用)
api/setup-webhook.js (未使用)
api/suzuri-batch-create.js (SUZURI未使用)
api/suzuri-create-product.js (SUZURI未使用)
api/suzuri-upload-image.js (SUZURI未使用)
api/sync-all-platforms.js (未使用)
api/sync-inventory.js (未使用)
api/test-supabase.js (テスト用)
api/test-webhook-api.js (テスト用)
api/update-all-shops-prices.js (未使用)
api/webhooks/printify.js (未使用)
```

### 5. 未使用スクリプト（scripts/）- 削除
```
scripts/calculate-market-based-prices.js (未使用)
scripts/check-printify-capabilities.js (未使用)
scripts/compare-provider-prices.js (未使用)
scripts/create-ebay-business-policies.js (eBay未使用)
scripts/delete-all-suzuri-materials.js (SUZURI未使用)
scripts/ebay-profit-analysis.js (eBay未使用)
scripts/platform-manager.js (未使用)
scripts/publish-ebay-products.js (eBay未使用)
scriptstest-variant-api.js (誤命名)
```

### 6. 未使用ライブラリ（lib/）- 削除
```
lib/ebayAuth.js (eBay未使用)
lib/ebayInventory.js (eBay未使用)
lib/ebayMetadataHelper.js (eBay未使用)
lib/pricingLogger.js (未使用)
lib/processedProductsTracker.js (未使用)
lib/rate-limiter.js (重複)
lib/seoOptimizer.js (未使用)
lib/supabase.js (未使用)
```

### 7. 未使用サービス（services/）- 削除
```
services/file-utils.js (未使用)
services/price-calculator.js (未使用)
services/product-fetcher.js (未使用)
services/product-fetcher-printify.js (未使用)
services/product-recreator.js (未使用)
services/product-scorer.js (未使用)
services/report-generator.js (未使用)
```

### 8. 古いレポート（ルート）- 削除
```
pricing-reports/ (全ディレクトリ)
product-selections/ (全ディレクトリ)
research-reports/ (全ディレクトリ)
storefront-publish-errors.json
storefront-status.json
suzuri-items.json
suzuri-sync-report-1761196285153.json
printify-etsy-products-sample.json
master-pricing-reference.json
```

### 9. 未使用設定（config/）- 削除
```
config/ebay-product-metadata.js (eBay未使用)
config/market-research-config.js (未使用)
config/pricing-config.js (未使用)
config/product-selection-config.js (未使用)
config/shops-config.js (未使用)
```

### 10. 古いドキュメント（ルート）- 削除
```
API_CONFIGURATION_STATUS.md (古い)
API_INTEGRATION_GUIDE.md (古い)
AUTO_PUBLISH_SETUP_GUIDE.md (古い)
CUSTOM_DOMAIN_SETUP.md (古い)
EBAY_API_APPLICATION_INFO.md (eBay未使用)
EBAY_API_KEYS_GUIDE.md (eBay未使用)
EBAY_API_SETUP.md (eBay未使用)
ETSY_API_APPROVAL_GUIDE.md (古い)
FUNCTIONALITY_CHECKLIST.md (古い)
IMAGE_GENERATION_RULES.md (未使用)
PRICING_SYSTEM.md (古い)
PRINTIFY_WORKFLOW_GUIDE.md (古い)
PRODUCT_LISTING_STANDARDS.md (古い)
PRODUCTION_STRATEGY.md (古い)
SETUP.md (古い)
SUZURI-SETUP-GUIDE.md (SUZURI未使用)
TESTING_GUIDE.md (古い)
```

### 11. n8n workflows（使用していない）- 削除
```
n8n-workflows/sns-auto-post-template.json
```

---

## ✅ 残すべきファイル

### フロントエンド
- `public/index.html` - メインツール
- `public/shop.html` - リダイレクトページ

### 有効なAPI
- `api/etsy-auth-start.js`
- `api/etsy-callback.js`
- `api/etsy-publish-products.js`
- `api/generate-ideas.js`
- `api/generate-image.js`
- `api/generate-sns.js`
- `api/get-blueprint-costs.js`
- `api/get-idea-history.js`
- `api/get-printify-product.js`
- `api/get-processed-stats.js`
- `api/health.js`
- `api/printify-create-product.js`
- `api/printify-update-prices.js`
- `api/printify-upload-image.js`

### 有効なライブラリ
- `lib/blueprintCosts.js`
- `lib/errorHandler.js`
- `lib/etsyOAuth.js`
- `lib/logger.js`
- `lib/rateLimiter.js`

### 有効な設定
- `config/blueprint-mapping.js`

### 有効なスクリプト
- `scripts/get-etsy-shop-id.js`
- `scripts/get-storefront-url.js`
- `scripts/list-printify-shops.js`
- `scripts/README.md`

### 有効なドキュメント
- `README.md`
- `DEPLOYMENT_SUMMARY.md`
- `ETSY_API_INTEGRATION_PLAN.md`
- `PUBLIC_DOMAIN_JAPANESE_ART_RESEARCH.md`
- `SYSTEM_STATUS.md` (新規作成)

### 設定ファイル
- `.vercel/project.json`
- `jest.config.js`
- `package.json`
- `package-lock.json`
- `vercel.json`

### テスト
- `tests/` (全保持)

---

## 📊 削除統計

- **削除ファイル数**: 約120ファイル
- **削除ディレクトリ数**: 7個
- **保持ファイル数**: 約30ファイル
- **ディスクスペース削減**: 推定80-90%
