// 処理済み商品の統計取得
import { asyncHandler, validateRequired } from '../lib/errorHandler.js';
import { getProcessedStats } from '../lib/processedProductsTracker.js';

async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const shopId = req.method === 'GET'
        ? req.query.shopId
        : req.body.shopId;

    const processType = req.method === 'GET'
        ? req.query.processType
        : req.body.processType;

    if (!shopId) {
        return res.status(400).json({ error: 'shopId is required' });
    }

    try {
        const stats = await getProcessedStats(shopId, processType || null);

        res.status(200).json({
            success: true,
            shopId: shopId,
            stats: stats
        });

    } catch (error) {
        console.error('❌ 統計取得エラー:', error);
        throw error;
    }
}

export default asyncHandler(handler);
