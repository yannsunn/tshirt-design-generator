// SUZURI API - 商品作成（Material → Product変換）
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateRequired, validateEnv, ExternalAPIError } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['SUZURI_ACCESS_TOKEN']);
    validateRequired(req.body, ['materialId', 'itemId']);

    const { materialId, itemId, published = true } = req.body;
    const accessToken = process.env.SUZURI_ACCESS_TOKEN;

    try {
        console.log(`📦 SUZURI商品作成: Material ${materialId} → Item ${itemId}`);

        // SUZURI Item IDマッピング
        // 1: Tシャツ, 2: パーカー, 3: スウェット等
        const itemIds = {
            'tshirt': 1,
            'hoodie': 2,
            'sweatshirt': 3
        };

        const targetItemId = itemIds[itemId] || itemId;

        // SUZURI API - Create Product from Material
        const response = await fetch(`https://suzuri.jp/api/v1/materials/${materialId}/products`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                itemId: targetItemId,
                published: published
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new ExternalAPIError('SUZURI', `Failed to create product (${response.status})`, errorText);
        }

        const result = await response.json();
        console.log(`✅ SUZURI商品作成成功: ID ${result.id}`);

        res.status(200).json({
            success: true,
            productId: result.id,
            product: result,
            message: 'SUZURI商品を作成しました'
        });

    } catch (error) {
        console.error('❌ SUZURI商品作成エラー:', error);
        throw error;
    }
}

// レート制限: 10リクエスト/分
export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 10, windowMs: 60000 }
);
