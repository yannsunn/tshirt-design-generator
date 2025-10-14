// 既存Printify商品をマスターベースで再作成（バッチ処理）
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv } from '../lib/errorHandler.js';
import { isProductProcessed, markProductAsProcessed } from '../lib/processedProductsTracker.js';
import {
    fetchProductsFromShop,
    fetchProductDetail,
    fetchMasterProduct,
    createProductFromMaster,
    deleteProduct,
    shouldSkipProduct
} from '../services/product-recreator.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);

    const { shopId, offset = 0, limit = 5, deleteOld = false } = req.body;
    const apiKey = process.env.PRINTIFY_API_KEY;

    if (!shopId) {
        return res.status(400).json({ error: 'shopId is required' });
    }

    try {
        console.log(`🔄 商品再作成開始: Shop ${shopId}, Offset ${offset}, Limit ${limit}`);

        // Step 1: 既存商品を取得
        const { targetProducts, allProducts } = await fetchProductsFromShop(shopId, apiKey, offset, limit);

        console.log(`📋 ${targetProducts.length}商品を処理対象として取得`);

        const results = [];
        let recreatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const product of targetProducts) {
            try {
                // 既に処理済みかチェック
                const alreadyProcessed = await isProductProcessed(product.id, shopId, 'recreate_from_master');
                if (alreadyProcessed) {
                    console.log(`⏭️ スキップ（処理済み）: ${product.title}`);
                    skippedCount++;
                    results.push({
                        oldProductId: product.id,
                        title: product.title,
                        status: 'skipped',
                        reason: 'Already processed'
                    });
                    continue;
                }

                // Step 2: 商品の詳細を取得
                const detail = await fetchProductDetail(shopId, product.id, apiKey);
                const blueprintId = detail.blueprint_id;

                // スキップ判定
                const skipCheck = shouldSkipProduct(product, blueprintId);
                if (skipCheck.skip) {
                    console.log(`⏭️ スキップ: ${product.title} (${skipCheck.reason})`);
                    skippedCount++;
                    results.push({
                        oldProductId: product.id,
                        title: product.title,
                        blueprintId: blueprintId,
                        status: 'skipped',
                        reason: skipCheck.reason
                    });
                    continue;
                }

                const masterProductId = skipCheck.masterProductId;

                // 既存画像IDを取得
                const existingImageId = detail.images?.[0]?.id;
                if (!existingImageId) {
                    console.log(`⚠️ スキップ（画像なし）: ${product.title}`);
                    skippedCount++;
                    results.push({
                        oldProductId: product.id,
                        title: product.title,
                        status: 'skipped',
                        reason: 'No image found'
                    });
                    continue;
                }

                console.log(`🔨 再作成中: ${product.title} (Blueprint ${blueprintId} → Master ${masterProductId})`);

                // Step 3: マスター商品から新しい商品を作成
                const master = await fetchMasterProduct(shopId, masterProductId, apiKey);
                const createdProduct = await createProductFromMaster(shopId, apiKey, detail, master, existingImageId);

                console.log(`✅ 再作成成功: ${createdProduct.title} (New ID: ${createdProduct.id})`);

                // 処理済みとして記録
                await markProductAsProcessed(
                    product.id,
                    shopId,
                    'recreate_from_master',
                    detail.title,
                    {
                        oldProductId: product.id,
                        newProductId: createdProduct.id,
                        blueprintId: blueprintId,
                        masterProductId: masterProductId,
                        recreatedAt: new Date().toISOString()
                    }
                );

                // Step 4: 古い商品を削除（オプション）
                let deleted = false;
                if (deleteOld) {
                    deleted = await deleteProduct(shopId, product.id, apiKey);
                    if (deleted) {
                        console.log(`🗑️ 古い商品を削除: ${product.id}`);
                    } else {
                        console.warn(`⚠️ 削除失敗: ${product.id}`);
                    }
                }

                recreatedCount++;
                results.push({
                    oldProductId: product.id,
                    newProductId: createdProduct.id,
                    title: detail.title,
                    blueprintId: blueprintId,
                    masterProductId: masterProductId,
                    status: 'success',
                    deleted: deleted
                });

                // レート制限対策
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`❌ エラー（${product.id}）:`, error.message);
                errorCount++;
                results.push({
                    oldProductId: product.id,
                    title: product.title,
                    status: 'error',
                    error: error.message
                });
            }
        }

        console.log(`📊 完了: 再作成${recreatedCount}件、スキップ${skippedCount}件、エラー${errorCount}件`);

        res.status(200).json({
            success: true,
            recreated: recreatedCount,
            skipped: skippedCount,
            errors: errorCount,
            total: targetProducts.length,
            offset: offset,
            limit: limit,
            hasMore: offset + limit < allProducts.length,
            nextOffset: offset + limit,
            results: results,
            message: `✅ ${recreatedCount}商品を再作成しました`
        });

    } catch (error) {
        console.error('❌ 再作成エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 3, windowMs: 60000 }
);
