// Etsy商品公開API（1商品ずつ選択可能）
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateRequired, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);
    validateRequired(req.body, ['productIds']);

    const { productIds } = req.body; // 配列で受け取る
    const apiKey = process.env.PRINTIFY_API_KEY;
    const etsyShopId = '24566474'; // My Etsy Store

    if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'productIds must be a non-empty array' });
    }

    try {
        console.log(`📤 Etsy公開開始: ${productIds.length}商品`);

        const results = [];
        let publishedCount = 0;
        let errorCount = 0;

        for (const productId of productIds) {
            try {
                console.log(`📤 公開中: ${productId}`);

                // Printify Publish API
                const publishResponse = await fetch(
                    `https://api.printify.com/v1/shops/${etsyShopId}/products/${productId}/publish.json`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            title: true,      // タイトルを公開
                            description: true, // 説明文を公開
                            images: true,     // 画像を公開
                            variants: true,   // バリアントを公開
                            tags: true,       // タグを公開
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

        console.log(`📊 Etsy公開完了: 成功${publishedCount}件、エラー${errorCount}件`);

        res.status(200).json({
            success: true,
            published: publishedCount,
            errors: errorCount,
            total: productIds.length,
            results,
            message: `✅ Etsy公開完了: ${publishedCount}/${productIds.length}件を公開しました`
        });

    } catch (error) {
        console.error('❌ Etsy公開エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 5, windowMs: 60000 }
);
