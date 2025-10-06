// 特定商品の価格を強制更新（Blueprint ID 12対応）
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateRequired, validateEnv } from '../lib/errorHandler.js';
import { logPriceChange, logError } from '../lib/pricingLogger.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);
    validateRequired(req.body, ['shopId', 'productId']);

    const { shopId, productId, targetMargin = 38 } = req.body;
    const apiKey = process.env.PRINTIFY_API_KEY;

    // Blueprint原価データ（完全版）
    const blueprintCosts = {
        706: { baseCost: 1241, extraCost: { '2XL': 1367, '3XL': 1571, '4XL': 1766 }, name: 'Custom T-Shirt (Master)' },
        1296: { baseCost: 3064, extraCost: { '2XL': 3548, '3XL': 4181 }, name: 'Custom Sweatshirt (Master)' },
        6: { baseCost: 1167, extraCost: { '2XL': 1544, '3XL': 1636, '4XL': 1636, '5XL': 1636 }, name: 'Gildan 5000 T-Shirt' },
        26: { baseCost: 1480, extraCost: { '2XL': 1987, '3XL': 2414 }, name: 'Gildan 980 Lightweight Tee' },
        36: { baseCost: 1195, extraCost: { '2XL': 1557, '3XL': 1810, '4XL': 1802, '5XL': 1800 }, name: 'Gildan 2000 Ultra Cotton Tee' },
        145: { baseCost: 1192, extraCost: { '2XL': 1457, '3XL': 1743 }, name: 'Gildan 64000 Softstyle T-Shirt' },
        157: { baseCost: 1093, extraCost: {}, name: 'Gildan 5000B Kids Tee' },
        80: { baseCost: 2089, extraCost: {}, name: 'Gildan 2400 Long Sleeve Tee' },
        49: { baseCost: 2230, extraCost: {}, name: 'Gildan 18000 Sweatshirt' },
        77: { baseCost: 2847, extraCost: { '2XL': 3208, '3XL': 3615, '4XL': 3615, '5XL': 3615 }, name: 'Gildan 18500 Hoodie' },
        5: { baseCost: 1233, extraCost: { '2XL': 1544, '3XL': 1636, '4XL': 1636 }, name: 'Bella+Canvas 3001 Unisex Jersey Short Sleeve Tee' },
        384: { baseCost: 2587, extraCost: { '2XL': 3193, '3XL': 3592 }, name: 'Bella+Canvas 3719 Unisex Fleece Pullover Hooded Sweatshirt' },
        903: { baseCost: 1636, extraCost: { '2XL': 2039, '3XL': 2131 }, name: 'Comfort Colors 1717 Garment-Dyed Heavyweight T-Shirt' },
        12: { baseCost: 1636, extraCost: { '2XL': 2039 }, name: 'Next Level 6210 Unisex Tri-Blend T-Shirt' },
        380: { baseCost: 1233, extraCost: { '2XL': 1544, '3XL': 1636, '4XL': 1636 }, name: 'District DT6000 Very Important Tee' }
    };

    const calculateOptimalPrice = (costCents, targetMargin) => {
        const costUsd = costCents / 100;
        const exactPriceUsd = costUsd / (1 - targetMargin / 100);
        const priceUsd = Math.ceil(exactPriceUsd) - 0.01;
        return Math.round(priceUsd * 100);
    };

    try {
        console.log(`🔧 単一商品価格更新: ${productId}`);

        // 商品詳細を取得
        const detailResponse = await fetch(
            `https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!detailResponse.ok) {
            return res.status(detailResponse.status).json({
                error: 'Failed to fetch product',
                status: detailResponse.status
            });
        }

        const product = await detailResponse.json();
        const blueprintId = product.blueprint_id;
        const variants = product.variants || [];

        const costInfo = blueprintCosts[blueprintId];
        if (!costInfo) {
            return res.status(400).json({
                error: 'Unknown blueprint',
                blueprintId: blueprintId
            });
        }

        // 各variantに最適価格を設定
        const updatedVariants = variants.map(variant => {
            const variantTitle = variant.title || '';
            let cost = costInfo.baseCost;

            // サイズ別の原価を適用
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

        // 商品を更新
        const updateResponse = await fetch(
            `https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`,
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
            return res.status(updateResponse.status).json({
                error: 'Failed to update product',
                details: errorText
            });
        }

        console.log(`✅ 更新成功: ${product.title}`);

        // 価格変更ログを記録
        const oldPrices = variants.map(v => v.price);
        const newPrices = updatedVariants.map(v => v.price);
        const logEntry = logPriceChange(productId, shopId, {
            oldPrice: oldPrices[0], // 代表価格
            newPrice: newPrices[0],
            blueprint: blueprintId,
            margin: targetMargin,
            reason: 'manual_single_update'
        });

        res.status(200).json({
            success: true,
            productId: productId,
            title: product.title,
            blueprintId: blueprintId,
            blueprintName: costInfo.name,
            variantsUpdated: updatedVariants.length,
            log: logEntry
        });

    } catch (error) {
        const errorLog = logError('printify-update-single-product', error, {
            shopId,
            productId,
            targetMargin
        });
        console.error('❌ 商品更新エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 10, windowMs: 60000 }
);
