// Printifyサイズ別価格バッチ更新（8商品ずつ処理、Vercel 10秒制限対応）
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateRequired, validateEnv, ExternalAPIError } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);
    validateRequired(req.body, ['shopId']);

    const { shopId, offset = 0, limit = 8, targetMargin = 38 } = req.body;
    const apiKey = process.env.PRINTIFY_API_KEY;

    // Blueprint IDごとの原価マッピング
    const blueprintCosts = {
        6: { baseCost: 900, extraCost: { '2XL': 1200, '3XL': 1500 }, name: 'Gildan 5000 T-Shirt' },
        26: { baseCost: 1050, extraCost: { '2XL': 1350, '3XL': 1650 }, name: 'Gildan 980 Lightweight Tee' },
        36: { baseCost: 1200, extraCost: { '2XL': 1500, '3XL': 1800 }, name: 'Gildan 2000 Ultra Cotton Tee' },
        145: { baseCost: 1050, extraCost: { '2XL': 1350, '3XL': 1650 }, name: 'Gildan 64000 Softstyle T-Shirt' },
        157: { baseCost: 750, extraCost: {}, name: 'Gildan 5000B Kids Tee' },
        80: { baseCost: 1350, extraCost: { '2XL': 1650, '3XL': 1950 }, name: 'Gildan 2400 Long Sleeve Tee' },
        49: { baseCost: 2100, extraCost: { '2XL': 2550, '3XL': 3000 }, name: 'Gildan 18000 Sweatshirt' },
        77: { baseCost: 2550, extraCost: { '2XL': 3000, '3XL': 3450 }, name: 'Gildan 18500 Hoodie' }
    };

    // USD $X.99 価格計算関数
    const JPY_TO_USD = 150;
    const calculateOptimalPrice = (costJpy, targetMargin) => {
        const costUsd = costJpy / JPY_TO_USD;
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

        // 各商品を処理
        for (const product of products) {
            try {
                console.log(`処理中: ${product.title} (ID: ${product.id})`);

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

                    if (variantTitle.includes('2XL')) {
                        cost = costInfo.extraCost['2XL'] || costInfo.baseCost * 1.33;
                    } else if (variantTitle.includes('3XL')) {
                        cost = costInfo.extraCost['3XL'] || costInfo.baseCost * 1.67;
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

                // レート制限対策
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`Error processing product ${product.id}:`, error);
                errorCount++;
            }
        }

        const hasMore = offset + limit < totalProducts;

        console.log(`📊 バッチ処理完了: 更新${updatedCount}件、スキップ${skippedCount}件、エラー${errorCount}件`);

        res.status(200).json({
            success: true,
            updated: updatedCount,
            skipped: skippedCount,
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
