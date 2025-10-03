// Printifyサイズ別価格バッチ更新（8商品ずつ処理、Vercel 10秒制限対応）
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateRequired, validateEnv, ExternalAPIError } from '../lib/errorHandler.js';
import { isProductProcessed, markProductAsProcessed } from '../lib/processedProductsTracker.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);
    validateRequired(req.body, ['shopId']);

    const { shopId, offset = 0, limit = 8, targetMargin = 38 } = req.body;
    const apiKey = process.env.PRINTIFY_API_KEY;

    // Blueprint IDごとの原価マッピング (実際のPrintify原価、セント単位)
    // 2025年10月時点の実測値
    const blueprintCosts = {
        // ユーザーカスタムマスター商品（優先）
        706: { baseCost: 1241, extraCost: { '2XL': 1367, '3XL': 1571, '4XL': 1766 }, name: 'Custom T-Shirt (Master)' },
        1296: { baseCost: 3064, extraCost: { '2XL': 3548, '3XL': 4181 }, name: 'Custom Sweatshirt (Master)' },

        // 標準Blueprint（参考用）
        6: { baseCost: 1167, extraCost: { '2XL': 1544, '3XL': 1636, '4XL': 1636, '5XL': 1636 }, name: 'Gildan 5000 T-Shirt' },
        26: { baseCost: 1480, extraCost: { '2XL': 1987, '3XL': 2414 }, name: 'Gildan 980 Lightweight Tee' },
        36: { baseCost: 1195, extraCost: { '2XL': 1557, '3XL': 1810, '4XL': 1802, '5XL': 1800 }, name: 'Gildan 2000 Ultra Cotton Tee' },
        145: { baseCost: 1192, extraCost: { '2XL': 1457, '3XL': 1743 }, name: 'Gildan 64000 Softstyle T-Shirt' },
        157: { baseCost: 1093, extraCost: {}, name: 'Gildan 5000B Kids Tee' },
        80: { baseCost: 2089, extraCost: {}, name: 'Gildan 2400 Long Sleeve Tee' },
        49: { baseCost: 2230, extraCost: {}, name: 'Gildan 18000 Sweatshirt' },
        77: { baseCost: 2847, extraCost: { '2XL': 3208, '3XL': 3615, '4XL': 3615, '5XL': 3615 }, name: 'Gildan 18500 Hoodie' }
    };

    // USD $X.99 価格計算関数
    const calculateOptimalPrice = (costCents, targetMargin) => {
        const costUsd = costCents / 100;
        const exactPriceUsd = costUsd / (1 - targetMargin / 100);
        const priceUsd = Math.ceil(exactPriceUsd) - 0.01;
        return Math.round(priceUsd * 100);
    };

    try {
        console.log(`📊 バッチ価格更新開始: offset=${offset}, limit=${limit}`);

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

        let updatedCount = 0;
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
                    'price_update'
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

                const detail = await detailResponse.json();
                const blueprintId = detail.blueprint_id;
                const variants = detail.variants || [];

                const costInfo = blueprintCosts[blueprintId];
                if (!costInfo) {
                    console.log(`Unknown blueprint ${blueprintId}, skipping`);
                    skippedCount++;
                    continue;
                }

                // 各variantに最適価格を設定
                const updatedVariants = variants.map(variant => {
                    const variantTitle = variant.title || '';
                    let cost = costInfo.baseCost;

                    // サイズ別の原価を適用（5XL → 4XL → 3XL → 2XL の順でチェック）
                    if (variantTitle.includes('5XL')) {
                        cost = costInfo.extraCost['5XL'] || costInfo.extraCost['4XL'] || costInfo.extraCost['3XL'] || Math.round(costInfo.baseCost * 1.67);
                    } else if (variantTitle.includes('4XL')) {
                        cost = costInfo.extraCost['4XL'] || costInfo.extraCost['3XL'] || Math.round(costInfo.baseCost * 1.67);
                    } else if (variantTitle.includes('3XL')) {
                        cost = costInfo.extraCost['3XL'] || Math.round(costInfo.baseCost * 1.67);
                    } else if (variantTitle.includes('2XL')) {
                        cost = costInfo.extraCost['2XL'] || Math.round(costInfo.baseCost * 1.33);
                    }

                    const optimalPrice = calculateOptimalPrice(cost, targetMargin);

                    return {
                        id: variant.id,
                        price: optimalPrice,
                        is_enabled: variant.is_enabled
                    };
                });

                // 価格が変更されたか確認
                const hasChanges = updatedVariants.some((updatedVariant, index) => {
                    return updatedVariant.price !== variants[index].price;
                });

                if (!hasChanges) {
                    console.log(`✓ 価格は既に最適です`);
                    skippedCount++;
                    continue;
                }

                // 商品を更新
                const updateResponse = await fetch(
                    `https://api.printify.com/v1/shops/${shopId}/products/${product.id}.json`,
                    {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            variants: updatedVariants
                        })
                    }
                );

                if (!updateResponse.ok) {
                    const errorText = await updateResponse.text();
                    console.error(`Failed to update product ${product.id}: ${errorText}`);
                    errorCount++;
                    continue;
                }

                console.log(`✅ 更新成功: ${costInfo.name}`);
                updatedCount++;

                // 📝 処理済みとして記録
                await markProductAsProcessed(
                    product.id,
                    shopId,
                    'price_update',
                    product.title,
                    {
                        blueprint_id: blueprintId,
                        blueprint_name: costInfo.name,
                        target_margin: targetMargin,
                        variants_updated: updatedVariants.length
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

        console.log(`📊 バッチ処理完了: 更新${updatedCount}件、既処理スキップ${alreadyProcessedCount}件、価格最適スキップ${skippedCount}件、エラー${errorCount}件`);

        res.status(200).json({
            success: true,
            updated: updatedCount,
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
        console.error('❌ バッチ価格更新エラー:', error);
        throw error;
    }
}

// レート制限: 10リクエスト/分
export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 10, windowMs: 60000 }
);
