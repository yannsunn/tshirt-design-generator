// Printify商品一覧取得API
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);

    const { shopId, page = '1', limit = '100' } = req.query;
    const apiKey = process.env.PRINTIFY_API_KEY;

    if (!shopId) {
        return res.status(400).json({ error: 'shopId is required' });
    }

    try {
        console.log(`📋 商品一覧取得: Shop ${shopId}, Page ${page}, Limit ${limit}`);

        const response = await fetch(
            `https://api.printify.com/v1/shops/${shopId}/products.json?limit=${limit}&page=${page}`,
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
            throw new Error(`Failed to fetch products: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        console.log(`✅ 商品取得成功: ${data.data?.length || 0}件`);

        res.status(200).json({
            success: true,
            products: data.data || [],
            currentPage: data.current_page || parseInt(page),
            lastPage: data.last_page || 1,
            total: data.total || data.data?.length || 0
        });

    } catch (error) {
        console.error('❌ 商品一覧取得エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 10, windowMs: 60000 }
);
