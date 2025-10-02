// BASE API - 商品作成
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateRequired, validateEnv, ExternalAPIError } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['BASE_ACCESS_TOKEN']);
    validateRequired(req.body, ['title', 'price', 'imageUrl']);

    const {
        title,
        price,
        imageUrl,
        detail = '',
        stock = 100,
        visible = 1,
        variations = []
    } = req.body;

    const accessToken = process.env.BASE_ACCESS_TOKEN;

    try {
        console.log(`📦 BASE商品作成: ${title} (¥${price})`);

        // BASE API - Create Product
        // POST /1/items/add
        const response = await fetch('https://api.thebase.in/1/items/add', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                detail: detail,
                price: price,
                stock: stock,
                visible: visible,
                img_url: imageUrl,
                variations: variations
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new ExternalAPIError('BASE', `Failed to create product (${response.status})`, errorText);
        }

        const result = await response.json();
        console.log(`✅ BASE商品作成成功: ID ${result.item && result.item.item_id}`);

        res.status(200).json({
            success: true,
            itemId: result.item && result.item.item_id,
            product: result.item,
            message: 'BASE商品を作成しました',
            note: '商品作成後、オリジナルプリント.jpアプリで印刷設定を行ってください'
        });

    } catch (error) {
        console.error('❌ BASE商品作成エラー:', error);
        throw error;
    }
}

// レート制限: 10リクエスト/分（BASE API日次制限: 1000商品）
export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 10, windowMs: 60000 }
);
