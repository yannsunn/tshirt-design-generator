// 処理済み商品記録のリセット
import { asyncHandler, validateRequired, validateEnv } from '../lib/errorHandler.js';
import { resetProcessedProducts, getProcessedStats } from '../lib/processedProductsTracker.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateRequired(req.body, ['shopId']);

    const { shopId, processType = null } = req.body;

    try {
        // リセット前の統計を取得
        const statsBefore = await getProcessedStats(shopId, processType);

        // 処理済み記録を削除
        const deletedCount = await resetProcessedProducts(shopId, processType);

        console.log(`🔄 処理済み記録をリセット: ${deletedCount}件削除`);

        res.status(200).json({
            success: true,
            deleted: deletedCount,
            processType: processType || 'all',
            statsBefore: statsBefore,
            message: processType
                ? `${processType}の処理済み記録を${deletedCount}件削除しました`
                : `すべての処理済み記録を${deletedCount}件削除しました`
        });

    } catch (error) {
        console.error('❌ リセットエラー:', error);
        throw error;
    }
}

export default asyncHandler(handler);
