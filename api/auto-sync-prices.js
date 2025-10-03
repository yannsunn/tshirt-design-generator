// 自動価格同期：Storefrontの価格をEtsy/eBayに自動反映
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);

    const { productIds } = req.body; // 特定商品のみ同期（省略時は全商品）
    const apiKey = process.env.PRINTIFY_API_KEY;

    const storefrontShopId = '24565480';
    const etsyShopId = '24566474';
    const ebayShopId = '24566516';

    try {
        console.log('🔄 自動価格同期開始');

        const results = [];
        let syncedCount = 0;
        let errorCount = 0;

        // Storefrontから価格を取得
        let targetProducts = [];

        if (productIds && productIds.length > 0) {
            // 指定商品のみ
            targetProducts = productIds;
        } else {
            // 全商品を取得（最初の100商品）
            const productsResponse = await fetch(
                `https://api.printify.com/v1/shops/${storefrontShopId}/products.json?limit=100&page=1`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!productsResponse.ok) {
                throw new Error('Failed to fetch products');
            }

            const productsData = await productsResponse.json();
            targetProducts = (productsData.data || []).map(p => p.id);
        }

        console.log(`📋 ${targetProducts.length}商品の価格を同期します`);

        for (const productId of targetProducts) {
            try {
                // Storefrontの商品詳細を取得
                const storefrontDetailResponse = await fetch(
                    `https://api.printify.com/v1/shops/${storefrontShopId}/products/${productId}.json`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!storefrontDetailResponse.ok) continue;

                const storefrontDetail = await storefrontDetailResponse.json();
                const storefrontVariants = storefrontDetail.variants;

                // Etsy/eBayに同じ価格を適用
                for (const targetShopId of [etsyShopId, ebayShopId]) {
                    try {
                        const targetDetailResponse = await fetch(
                            `https://api.printify.com/v1/shops/${targetShopId}/products/${productId}.json`,
                            {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${apiKey}`,
                                    'Content-Type': 'application/json'
                                }
                            }
                        );

                        if (!targetDetailResponse.ok) continue;

                        const targetDetail = await targetDetailResponse.json();

                        // バリアント価格を同期
                        const updatedVariants = targetDetail.variants.map((variant, index) => {
                            const storefrontVariant = storefrontVariants[index];
                            return {
                                id: variant.id,
                                price: storefrontVariant ? storefrontVariant.price : variant.price,
                                is_enabled: variant.is_enabled
                            };
                        });

                        // 価格変更があるかチェック
                        const hasChanges = updatedVariants.some((updatedVariant, index) => {
                            return updatedVariant.price !== targetDetail.variants[index].price;
                        });

                        if (!hasChanges) continue;

                        // 更新実行
                        const updateResponse = await fetch(
                            `https://api.printify.com/v1/shops/${targetShopId}/products/${productId}.json`,
                            {
                                method: 'PUT',
                                headers: {
                                    'Authorization': `Bearer ${apiKey}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    variants: updatedVariants
                                })
                            }
                        );

                        if (updateResponse.ok) {
                            syncedCount++;
                        }

                        await new Promise(resolve => setTimeout(resolve, 500));

                    } catch (error) {
                        console.error(`Error syncing to shop ${targetShopId}:`, error.message);
                        errorCount++;
                    }
                }

                console.log(`✅ 同期完了: ${productId}`);

                results.push({
                    productId,
                    status: 'synced'
                });

                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`Error processing product ${productId}:`, error.message);
                results.push({
                    productId,
                    status: 'error',
                    error: error.message
                });
                errorCount++;
            }
        }

        console.log(`📊 自動価格同期完了: ${syncedCount}件同期、${errorCount}件エラー`);

        res.status(200).json({
            success: true,
            synced: syncedCount,
            errors: errorCount,
            total: targetProducts.length,
            results,
            message: `✅ 自動価格同期完了: ${syncedCount}商品の価格を同期しました`
        });

    } catch (error) {
        console.error('❌ 自動価格同期エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 5, windowMs: 60000 }
);
