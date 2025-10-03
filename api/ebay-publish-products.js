// eBay商品公開API（テスト公開：最初の10商品または指定商品）
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);

    const { productIds, limit = 10 } = req.body; // productIds指定または limit件
    const apiKey = process.env.PRINTIFY_API_KEY;
    const ebayShopId = '24566516'; // Awake (eBay)

    try {
        let targetProductIds = productIds;

        // productIds指定がない場合、最初のlimit件を取得
        if (!productIds || productIds.length === 0) {
            console.log(`📋 最初の${limit}商品を取得中...`);

            const productsResponse = await fetch(
                `https://api.printify.com/v1/shops/${ebayShopId}/products.json?limit=${limit}&page=1`,
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
            const products = productsData.data || [];
            targetProductIds = products.slice(0, limit).map(p => p.id);

            console.log(`📋 ${targetProductIds.length}商品を公開対象に設定`);
        }

        if (!Array.isArray(targetProductIds) || targetProductIds.length === 0) {
            return res.status(400).json({ error: 'No products to publish' });
        }

        console.log(`📤 eBay公開開始: ${targetProductIds.length}商品`);

        const results = [];
        let publishedCount = 0;
        let errorCount = 0;

        for (const productId of targetProductIds) {
            try {
                console.log(`📤 公開中: ${productId}`);

                // Printify Publish API
                const publishResponse = await fetch(
                    `https://api.printify.com/v1/shops/${ebayShopId}/products/${productId}/publish.json`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            title: true,
                            description: true,
                            images: true,
                            variants: true,
                            tags: true,
                            keyFeatures: true,
                            shipping_template: true
                        })
                    }
                );

                if (!publishResponse.ok) {
                    const errorData = await publishResponse.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error(errorData.error || `Failed to publish: ${publishResponse.status}`);
                }

                const result = await publishResponse.json();
                console.log(`✅ 公開成功: ${productId}`);

                results.push({
                    productId,
                    status: 'published',
                    result
                });

                publishedCount++;

                // レート制限対策
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`❌ 公開失敗: ${productId} - ${error.message}`);
                results.push({
                    productId,
                    status: 'error',
                    error: error.message
                });
                errorCount++;
            }
        }

        console.log(`📊 eBay公開完了: 成功${publishedCount}件、エラー${errorCount}件`);

        res.status(200).json({
            success: true,
            published: publishedCount,
            errors: errorCount,
            total: targetProductIds.length,
            results,
            message: `✅ eBay公開完了: ${publishedCount}/${targetProductIds.length}件を公開しました`
        });

    } catch (error) {
        console.error('❌ eBay公開エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 5, windowMs: 60000 }
);
