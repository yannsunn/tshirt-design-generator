// Printify商品を販売チャネルに自動公開するAPI
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv, ExternalAPIError } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);

    const { shopId, productIds = [] } = req.body;

    if (!shopId) {
        return res.status(400).json({ error: 'shopId is required' });
    }

    if (productIds.length === 0) {
        return res.status(400).json({ error: 'productIds array is required' });
    }

    const apiKey = process.env.PRINTIFY_API_KEY;
    const results = [];
    let publishedCount = 0;
    let failedCount = 0;

    console.log(`📤 商品公開開始: ${productIds.length}件`);

    for (const productId of productIds) {
        try {
            console.log(`  公開中: Product ID ${productId}`);

            // Publish product to sales channel
            const response = await fetch(
                `https://api.printify.com/v1/shops/${shopId}/products/${productId}/publish.json`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: true,  // Publish with title
                        description: true,  // Publish with description
                        images: true,  // Publish with images
                        variants: true,  // Publish with variants
                        tags: true  // Publish with tags
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new ExternalAPIError('Printify', `Publish failed (${response.status})`, errorText);
            }

            const result = await response.json();

            results.push({
                productId,
                status: 'published',
                message: '公開成功'
            });
            publishedCount++;
            console.log(`  ✅ 公開成功: Product ID ${productId}`);

            // Rate limiting: Wait 200ms between requests (200 requests/30min = 6.67 req/min)
            await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
            console.error(`  ❌ 公開失敗: Product ID ${productId}`, error.message);
            results.push({
                productId,
                status: 'failed',
                error: error.message
            });
            failedCount++;
        }
    }

    console.log(`📊 公開完了: 成功${publishedCount}件、失敗${failedCount}件`);

    res.status(200).json({
        success: true,
        published: publishedCount,
        failed: failedCount,
        total: productIds.length,
        results: results,
        note: 'Printify商品は販売チャネル（Shopify等）に公開されました。モックアップ選択は手動で行ってください。'
    });
}

// Rate limiting: 200 requests per 30 minutes (Printify limit)
export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 200, windowMs: 1800000 } // 30 minutes
);
