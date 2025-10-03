// 全ショップ（Storefront、Etsy、eBay）の価格を一括更新
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateRequired, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);
    validateRequired(req.body, ['targetMargin']);

    const { targetMargin = 38, offset = 0, limit = 8 } = req.body;
    const apiKey = process.env.PRINTIFY_API_KEY;

    // 全ショップID
    const shops = [
        { id: '24565480', name: 'AwakeInc (Storefront)' },
        { id: '24566474', name: 'My Etsy Store' },
        { id: '24566516', name: 'Awake (eBay)' }
    ];

    // Blueprint原価データ (実際のPrintify原価、セント単位)
    const blueprintCosts = {
        6: { baseCost: 1167, extraCost: { '2XL': 1544, '3XL': 1636, '4XL': 1636, '5XL': 1636 }, name: 'Gildan 5000 T-Shirt' },
        26: { baseCost: 1480, extraCost: { '2XL': 1987, '3XL': 2414 }, name: 'Gildan 980 Lightweight Tee' },
        36: { baseCost: 1195, extraCost: { '2XL': 1557, '3XL': 1810, '4XL': 1802, '5XL': 1800 }, name: 'Gildan 2000 Ultra Cotton Tee' },
        145: { baseCost: 1192, extraCost: { '2XL': 1457, '3XL': 1743 }, name: 'Gildan 64000 Softstyle T-Shirt' },
        157: { baseCost: 1093, extraCost: {}, name: 'Gildan 5000B Kids Tee' },
        80: { baseCost: 2089, extraCost: {}, name: 'Gildan 2400 Long Sleeve Tee' },
        49: { baseCost: 2230, extraCost: {}, name: 'Gildan 18000 Sweatshirt' },
        77: { baseCost: 2847, extraCost: { '2XL': 3208, '3XL': 3615, '4XL': 3615, '5XL': 3615 }, name: 'Gildan 18500 Hoodie' }
    };

    const calculateOptimalPrice = (costCents, targetMargin) => {
        const costUsd = costCents / 100;
        const exactPriceUsd = costUsd / (1 - targetMargin / 100);
        const priceUsd = Math.ceil(exactPriceUsd) - 0.01;
        return Math.round(priceUsd * 100);
    };

    try {
        console.log(`📊 全ショップ価格更新開始 (3ショップ × offset=${offset}, limit=${limit})`);

        const results = {
            shops: []
        };

        // 各ショップを処理
        for (const shop of shops) {
            console.log(`\n🏪 処理中: ${shop.name}`);

            // 商品リストを取得
            const page = Math.floor(offset / 50) + 1;
            const productsResponse = await fetch(
                `https://api.printify.com/v1/shops/${shop.id}/products.json?limit=50&page=${page}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!productsResponse.ok) {
                console.error(`Failed to fetch products for ${shop.name}`);
                results.shops.push({
                    shopId: shop.id,
                    shopName: shop.name,
                    error: 'Failed to fetch products'
                });
                continue;
            }

            const productsData = await productsResponse.json();
            const allProducts = productsData.data || [];
            const startIndex = offset % 50;
            const products = allProducts.slice(startIndex, startIndex + limit);

            let updatedCount = 0;
            let skippedCount = 0;
            let errorCount = 0;

            for (const product of products) {
                try {
                    // 商品詳細を取得
                    const detailResponse = await fetch(
                        `https://api.printify.com/v1/shops/${shop.id}/products/${product.id}.json`,
                        {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    if (!detailResponse.ok) {
                        errorCount++;
                        continue;
                    }

                    const detail = await detailResponse.json();
                    const blueprintId = detail.blueprint_id;
                    const variants = detail.variants || [];

                    const costInfo = blueprintCosts[blueprintId];
                    if (!costInfo) {
                        skippedCount++;
                        continue;
                    }

                    // 各variantに最適価格を設定
                    const updatedVariants = variants.map(variant => {
                        const variantTitle = variant.title || '';
                        let cost = costInfo.baseCost;

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
                        skippedCount++;
                        continue;
                    }

                    // 商品を更新
                    const updateResponse = await fetch(
                        `https://api.printify.com/v1/shops/${shop.id}/products/${product.id}.json`,
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
                        errorCount++;
                        continue;
                    }

                    console.log(`✅ 更新: ${product.title.substring(0, 40)}`);
                    updatedCount++;

                    await new Promise(resolve => setTimeout(resolve, 500));

                } catch (error) {
                    console.error(`Error: ${product.id}`, error.message);
                    errorCount++;
                }
            }

            results.shops.push({
                shopId: shop.id,
                shopName: shop.name,
                updated: updatedCount,
                skipped: skippedCount,
                errors: errorCount,
                processed: products.length
            });

            console.log(`📊 ${shop.name}: 更新${updatedCount}件、スキップ${skippedCount}件、エラー${errorCount}件`);
        }

        const totalUpdated = results.shops.reduce((sum, s) => sum + (s.updated || 0), 0);
        const totalSkipped = results.shops.reduce((sum, s) => sum + (s.skipped || 0), 0);
        const totalErrors = results.shops.reduce((sum, s) => sum + (s.errors || 0), 0);

        res.status(200).json({
            success: true,
            totalUpdated,
            totalSkipped,
            totalErrors,
            results: results.shops,
            message: `✅ 全ショップ価格更新完了: ${totalUpdated}件を更新`
        });

    } catch (error) {
        console.error('❌ 全ショップ価格更新エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 5, windowMs: 60000 }
);
