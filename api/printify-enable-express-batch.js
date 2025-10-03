// Printify Express設定バッチ有効化（8商品ずつ処理、Vercel 10秒制限対応）
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateRequired, validateEnv, ExternalAPIError } from '../lib/errorHandler.js';
import { isProductProcessed, markProductAsProcessed } from '../lib/processedProductsTracker.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);
    validateRequired(req.body, ['shopId']);

    const { shopId, offset = 0, limit = 8 } = req.body;
    const apiKey = process.env.PRINTIFY_API_KEY;

    try {
        console.log(`📊 バッチExpress有効化開始: offset=${offset}, limit=${limit}`);

        // 商品リストを取得（limit件のみ）
        const page = Math.floor(offset / 50) + 1;
        const productsResponse = await fetch(
            `https://api.printify.com/v1/shops/${shopId}/products.json?limit=50&page=${page}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!productsResponse.ok) {
            const errorText = await productsResponse.text();
            throw new ExternalAPIError('Printify', `Failed to fetch products (${productsResponse.status})`, errorText);
        }

        const productsData = await productsResponse.json();
        const allProducts = productsData.data || [];
        const totalProducts = productsData.last_page * 50; // 概算

        // offset位置から limit件を取得
        const startIndex = offset % 50;
        const products = allProducts.slice(startIndex, startIndex + limit);

        console.log(`📋 ${products.length}商品を処理 (全体: 約${totalProducts}商品)`);

        let enabledCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        let alreadyProcessedCount = 0;

        // 各商品を処理
        for (const product of products) {
            try {
                console.log(`処理中: ${product.title} (ID: ${product.id})`);

                // 🔍 既に処理済みかチェック
                const alreadyProcessed = await isProductProcessed(
                    product.id,
                    shopId,
                    'express_enable'
                );

                if (alreadyProcessed) {
                    console.log(`⏭️ スキップ（既処理）: ${product.title}`);
                    alreadyProcessedCount++;
                    continue;
                }

                // 商品詳細を取得
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

                if (!detailResponse.ok) {
                    console.error(`Failed to fetch product ${product.id}`);
                    errorCount++;
                    continue;
                }

                const productDetail = await detailResponse.json();

                // Express対象外の場合はスキップ（処理済みとして記録）
                if (!productDetail.is_printify_express_eligible) {
                    console.log(`⏭️ スキップ (Express非対応): ${product.title}`);

                    // 非対応商品も記録して次回スキップ
                    await markProductAsProcessed(
                        product.id,
                        shopId,
                        'express_enable',
                        product.title,
                        { reason: 'not_eligible' }
                    );

                    skippedCount++;
                    continue;
                }

                // 既に有効の場合もスキップ（処理済みとして記録）
                if (productDetail.is_printify_express_enabled) {
                    console.log(`⏭️ スキップ (既に有効): ${product.title}`);

                    await markProductAsProcessed(
                        product.id,
                        shopId,
                        'express_enable',
                        product.title,
                        { reason: 'already_enabled' }
                    );

                    skippedCount++;
                    continue;
                }

                // Express設定を有効化
                console.log(`⚡ Express有効化中: ${product.title}`);
                const updateResponse = await fetch(
                    `https://api.printify.com/v1/shops/${shopId}/products/${product.id}.json`,
                    {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            is_printify_express_enabled: true
                        })
                    }
                );

                if (!updateResponse.ok) {
                    const errorData = await updateResponse.json().catch(() => ({ error: 'Unknown error' }));
                    console.error(`Express設定失敗: ${errorData.error || updateResponse.statusText}`);
                    errorCount++;
                    continue;
                }

                console.log(`✅ Express有効化成功: ${product.title}`);
                enabledCount++;

                // 📝 処理済みとして記録
                await markProductAsProcessed(
                    product.id,
                    shopId,
                    'express_enable',
                    product.title,
                    {
                        enabled: true,
                        blueprint_id: productDetail.blueprint_id
                    }
                );

                // レート制限対策
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`Error processing product ${product.id}:`, error);
                errorCount++;
            }
        }

        const hasMore = offset + limit < totalProducts;

        console.log(`📊 バッチ処理完了: 有効化${enabledCount}件、既処理スキップ${alreadyProcessedCount}件、条件外スキップ${skippedCount}件、エラー${errorCount}件`);

        res.status(200).json({
            success: true,
            enabled: enabledCount,
            skipped: skippedCount,
            alreadyProcessed: alreadyProcessedCount,
            errors: errorCount,
            processed: products.length,
            offset: offset,
            nextOffset: offset + limit,
            hasMore: hasMore,
            totalEstimate: totalProducts,
            progress: `${Math.min(offset + limit, totalProducts)}/${totalProducts}`
        });

    } catch (error) {
        console.error('❌ バッチExpress有効化エラー:', error);
        throw error;
    }
}

// レート制限: 10リクエスト/分
export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 10, windowMs: 60000 }
);
