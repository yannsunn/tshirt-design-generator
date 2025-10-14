// 全ショップ（Storefront、Etsy、eBay）の価格を一括更新
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateRequired, validateEnv } from '../lib/errorHandler.js';
import { logBatchUpdate, logPriceChange, logError } from '../lib/pricingLogger.js';
import { getAllShops } from '../config/shops-config.js';
import { PRICING_CONFIG } from '../config/pricing-config.js';
import { fetchProductsBatch, fetchProductDetail, updateProduct } from '../services/product-fetcher-printify.js';
import { generateUpdatedVariants, analyzeProductPricing } from '../services/price-calculator.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);
    validateRequired(req.body, ['targetMargin']);

    const { targetMargin = PRICING_CONFIG.DEFAULT_TARGET_MARGIN, offset = 0, limit = 8 } = req.body;
    const apiKey = process.env.PRINTIFY_API_KEY;

    // 全ショップ情報を設定から取得
    const shops = getAllShops();

    try {
        console.log(`📊 全ショップ価格更新開始 (${shops.length}ショップ × offset=${offset}, limit=${limit})`);

        const results = {
            shops: []
        };

        // 各ショップを処理
        for (const shop of shops) {
            console.log(`\n🏪 処理中: ${shop.name}`);

            try {
                // 商品リストを取得
                const { products } = await fetchProductsBatch(shop.id, apiKey, offset, limit);

                let updatedCount = 0;
                let skippedCount = 0;
                let errorCount = 0;

                for (const product of products) {
                    try {
                        // 商品詳細を取得
                        const detail = await fetchProductDetail(shop.id, product.id, apiKey);

                        // GET→PUT間の待機
                        await new Promise(resolve => setTimeout(resolve, PRICING_CONFIG.RATE_LIMITS.GET_PUT_DELAY));

                        // 価格分析
                        const analysis = analyzeProductPricing(detail, targetMargin);

                        // 更新が不要ならスキップ
                        if (!analysis.needsUpdate) {
                            skippedCount++;
                            continue;
                        }

                        // 更新用のバリアントデータを生成
                        const updatedVariants = generateUpdatedVariants(
                            detail.variants || [],
                            detail.blueprint_id,
                            targetMargin
                        );

                        // 商品を更新
                        await updateProduct(shop.id, product.id, apiKey, {
                            variants: updatedVariants
                        });

                        console.log(`✅ 更新: ${product.title.substring(0, 40)}`);
                        updatedCount++;

                        // 価格変更ログを記録
                        logPriceChange(product.id, shop.id, {
                            oldPrice: detail.variants[0]?.price,
                            newPrice: updatedVariants[0]?.price,
                            blueprint: detail.blueprint_id,
                            margin: targetMargin,
                            reason: 'batch_update'
                        });

                        // Printify API rate limit: 120 requests/minute = 2 requests/second
                        // Each product = 2 requests (GET + PUT), so wait 1 second between products
                        await new Promise(resolve => setTimeout(resolve, 1000));

                    } catch (error) {
                        console.error(`❌ Error: ${product.id}`, error.message);
                        errorCount++;
                        // エラー後も待機
                        await new Promise(resolve => setTimeout(resolve, PRICING_CONFIG.RATE_LIMITS.GET_PUT_DELAY));
                    }
                }

                results.shops.push({
                    shopId: shop.id,
                    shopName: shop.name,
                    updated: updatedCount,
                    skipped: skippedCount,
                    errors: errorCount,
                    processed: products.length
                });

                console.log(`📊 ${shop.name}: 更新${updatedCount}件、スキップ${skippedCount}件、エラー${errorCount}件`);

                // Wait between shops to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, PRICING_CONFIG.RATE_LIMITS.SHOP_CHANGE_DELAY));

            } catch (error) {
                console.error(`Failed to process shop ${shop.name}:`, error.message);
                results.shops.push({
                    shopId: shop.id,
                    shopName: shop.name,
                    error: error.message
                });
            }
        }

        const totalUpdated = results.shops.reduce((sum, s) => sum + (s.updated || 0), 0);
        const totalSkipped = results.shops.reduce((sum, s) => sum + (s.skipped || 0), 0);
        const totalErrors = results.shops.reduce((sum, s) => sum + (s.errors || 0), 0);

        // バッチ更新ログを記録
        const logEntry = logBatchUpdate({
            totalUpdated,
            totalSkipped,
            totalErrors,
            shops: results.shops,
            targetMargin,
            offset,
            limit
        });

        res.status(200).json({
            success: true,
            totalUpdated,
            totalSkipped,
            totalErrors,
            results: results.shops,
            message: `✅ 全ショップ価格更新完了: ${totalUpdated}件を更新`,
            log: logEntry
        });

    } catch (error) {
        logError('update-all-shops-prices', error, {
            targetMargin,
            offset,
            limit
        });
        console.error('❌ 全ショップ価格更新エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 5, windowMs: 60000 }
);
