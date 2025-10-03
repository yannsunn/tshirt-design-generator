// マスター商品のBlueprint確認API
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);

    const { productIds, shopId } = req.body;
    const apiKey = process.env.PRINTIFY_API_KEY;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'productIds array is required' });
    }

    if (!shopId) {
        return res.status(400).json({ error: 'shopId is required' });
    }

    try {
        console.log('🔍 マスター商品確認開始:', productIds);

        const results = [];

        for (const productId of productIds) {
            try {
                const response = await fetch(
                    `https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ 商品取得エラー (${productId}):`, errorText);
                    results.push({
                        productId,
                        error: `Failed to fetch product: ${response.status}`,
                        success: false
                    });
                    continue;
                }

                const product = await response.json();

                // Blueprint情報を取得
                const blueprintInfo = {
                    productId: product.id,
                    title: product.title,
                    blueprintId: product.blueprint_id,
                    printProviderId: product.print_provider_id,
                    variants: product.variants?.length || 0,
                    images: product.images?.length || 0,
                    mockups: product.options?.find(opt => opt.name === 'Mockups')?.enabled || false,
                    success: true
                };

                // Blueprint名を追加
                const blueprintNames = {
                    6: 'Gildan 5000 T-Shirt (Basic)',
                    26: 'Gildan 980 Lightweight Tee',
                    36: 'Gildan 2000 Ultra Cotton Tee',
                    145: 'Gildan 64000 Softstyle T-Shirt',
                    157: 'Gildan 5000B Kids Tee',
                    80: 'Gildan 2400 Long Sleeve Tee',
                    49: 'Gildan 18000 Sweatshirt',
                    77: 'Gildan 18500 Hoodie'
                };

                blueprintInfo.blueprintName = blueprintNames[product.blueprint_id] || `Unknown Blueprint ${product.blueprint_id}`;

                console.log(`✅ ${blueprintInfo.blueprintName} (ID: ${productId})`);
                results.push(blueprintInfo);

                await new Promise(resolve => setTimeout(resolve, 300));

            } catch (error) {
                console.error(`❌ エラー (${productId}):`, error.message);
                results.push({
                    productId,
                    error: error.message,
                    success: false
                });
            }
        }

        res.status(200).json({
            success: true,
            products: results,
            message: `✅ ${results.filter(r => r.success).length}/${productIds.length}商品を確認しました`
        });

    } catch (error) {
        console.error('❌ マスター商品確認エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 10, windowMs: 60000 }
);
