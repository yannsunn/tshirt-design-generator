// 全マスター商品のIDとBlueprintを取得
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);

    const apiKey = process.env.PRINTIFY_API_KEY;
    const shopId = '24565480';

    try {
        console.log('📋 マスター商品一覧取得開始');

        // 全商品を取得
        const response = await fetch(
            `https://api.printify.com/v1/shops/${shopId}/products.json?limit=100&page=1`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch products: ${response.status}`);
        }

        const data = await response.json();
        const allProducts = data.data || [];

        // [MASTER]で始まる商品のみをフィルター
        const masterProducts = allProducts.filter(p =>
            p.title && p.title.includes('[MASTER]')
        );

        console.log(`✅ ${masterProducts.length}個のマスター商品を発見`);

        // 各マスター商品の詳細を取得
        const detailedMasters = [];

        for (const product of masterProducts) {
            try {
                const detailResponse = await fetch(
                    `https://api.printify.com/v1/shops/${shopId}/products/${product.id}.json`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (detailResponse.ok) {
                    const detail = await detailResponse.json();
                    detailedMasters.push({
                        id: detail.id,
                        title: detail.title,
                        blueprintId: detail.blueprint_id,
                        printProviderId: detail.print_provider_id,
                        variants: detail.variants?.length || 0
                    });
                }

                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.error(`Error fetching ${product.id}:`, error.message);
            }
        }

        // Blueprint名のマッピング
        const blueprintNames = {
            6: 'Gildan 5000 T-Shirt',
            26: 'Gildan 980 Lightweight Tee',
            36: 'Gildan 2000 Ultra Cotton Tee',
            145: 'Gildan 64000 Softstyle T-Shirt',
            157: 'Gildan 5000B Kids Tee',
            80: 'Gildan 2400 Long Sleeve Tee',
            49: 'Gildan 18000 Sweatshirt',
            77: 'Gildan 18500 Hoodie'
        };

        // Blueprint IDでソート
        detailedMasters.sort((a, b) => {
            const orderA = Object.keys(blueprintNames).indexOf(String(a.blueprintId));
            const orderB = Object.keys(blueprintNames).indexOf(String(b.blueprintId));
            return orderA - orderB;
        });

        res.status(200).json({
            success: true,
            total: detailedMasters.length,
            masterProducts: detailedMasters,
            message: `✅ ${detailedMasters.length}個のマスター商品を取得しました`
        });

    } catch (error) {
        console.error('❌ マスター商品取得エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 10, windowMs: 60000 }
);
