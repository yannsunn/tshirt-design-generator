// Printify商品の最適価格を計算（38%利益率を達成）
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv, ExternalAPIError } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);

    const { shopId, targetMargin = 38 } = req.body; // デフォルト38%

    if (!shopId) {
        return res.status(400).json({ error: 'shopId is required' });
    }

    const apiKey = process.env.PRINTIFY_API_KEY;

    try {
        console.log(`📊 最適価格計算開始: 目標利益率${targetMargin}%`);

        // Blueprint IDごとの原価マッピング（Printify MyLocker）
        // 注: これは推定値です。実際の原価はvariant APIから取得できない場合があります
        const blueprintCosts = {
            // Tシャツ系（1円 = $0.0067として計算、USD原価を円換算）
            6: {  // Gildan 5000
                baseCost: 900,  // S-XL: $6 × 150
                extraCost: { '2XL': 1200, '3XL': 1500 }  // $8, $10
            },
            26: {  // Gildan 980
                baseCost: 1050,
                extraCost: { '2XL': 1350, '3XL': 1650 }
            },
            36: {  // Gildan 2000
                baseCost: 1200,
                extraCost: { '2XL': 1500, '3XL': 1800 }
            },
            145: {  // Gildan 64000
                baseCost: 1050,
                extraCost: { '2XL': 1350, '3XL': 1650 }
            },
            157: {  // Gildan 5000B Kids
                baseCost: 750,
                extraCost: {}  // キッズサイズは追加料金なし
            },
            // 長袖・スウェット・フーディ
            80: {  // Long Sleeve
                baseCost: 1350,
                extraCost: { '2XL': 1650, '3XL': 1950 }
            },
            49: {  // Sweatshirt
                baseCost: 2100,
                extraCost: { '2XL': 2550, '3XL': 3000 }
            },
            77: {  // Hoodie
                baseCost: 2550,
                extraCost: { '2XL': 3000, '3XL': 3450 }
            }
        };

        // 1. 全商品を取得
        console.log('📋 商品リストを取得中...');
        const productsResponse = await fetch(
            `https://api.printify.com/v1/shops/${shopId}/products.json`,
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
        const products = productsData.data || [];
        console.log(`✅ ${products.length}商品を取得`);

        const results = [];
        let needsUpdate = 0;
        let optimal = 0;

        // 2. 各商品の価格を分析
        for (const product of products) {
            try {
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
                    continue;
                }

                const detail = await detailResponse.json();
                const blueprintId = detail.blueprint_id;
                const variants = detail.variants || [];

                const costInfo = blueprintCosts[blueprintId];
                if (!costInfo) {
                    console.log(`Unknown blueprint ${blueprintId}, skipping`);
                    continue;
                }

                // 各variantを分析
                const variantAnalysis = [];
                let hasSuboptimalPricing = false;

                for (const variant of variants) {
                    // サイズを推定（variant titleから抽出）
                    const variantTitle = variant.title || '';
                    let size = 'standard';
                    let cost = costInfo.baseCost;

                    // 2XL/3XLを検出
                    if (variantTitle.includes('2XL')) {
                        size = '2XL';
                        cost = costInfo.extraCost['2XL'] || costInfo.baseCost * 1.33;
                    } else if (variantTitle.includes('3XL')) {
                        size = '3XL';
                        cost = costInfo.extraCost['3XL'] || costInfo.baseCost * 1.67;
                    }

                    const currentPrice = variant.price || 0;
                    const profit = currentPrice - cost;
                    const actualMargin = currentPrice > 0 ? (profit / currentPrice) * 100 : 0;

                    // 目標利益率を達成する最適価格を計算（USD $X.99）
                    const JPY_TO_USD = 150;
                    const costUsd = cost / JPY_TO_USD;
                    const exactPriceUsd = costUsd / (1 - targetMargin / 100);
                    const priceUsd = Math.ceil(exactPriceUsd) - 0.01;
                    const optimalPrice = Math.round(priceUsd * 100); // セント単位

                    // 利益計算（ドル単位で計算）
                    const optimalProfit = priceUsd - costUsd;
                    const optimalMargin = (optimalProfit / priceUsd) * 100;

                    variantAnalysis.push({
                        variantId: variant.id,
                        title: variantTitle,
                        size: size,
                        cost: cost,
                        currentPrice: currentPrice,
                        actualMargin: actualMargin.toFixed(1),
                        optimalPrice: optimalPrice,
                        optimalMargin: optimalMargin.toFixed(1),
                        needsUpdate: Math.abs(actualMargin - targetMargin) > 2  // 2%以上の差があれば更新必要
                    });

                    if (Math.abs(actualMargin - targetMargin) > 2) {
                        hasSuboptimalPricing = true;
                    }
                }

                results.push({
                    productId: product.id,
                    title: product.title,
                    blueprintId: blueprintId,
                    variants: variantAnalysis,
                    needsUpdate: hasSuboptimalPricing
                });

                if (hasSuboptimalPricing) {
                    needsUpdate++;
                } else {
                    optimal++;
                }

                // レート制限対策
                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (error) {
                console.error(`Error analyzing product ${product.id}:`, error.message);
            }
        }

        console.log(`✅ 分析完了: ${optimal}商品が最適、${needsUpdate}商品が更新必要`);

        res.status(200).json({
            success: true,
            targetMargin: targetMargin,
            summary: {
                total: products.length,
                optimal: optimal,
                needsUpdate: needsUpdate
            },
            results: results,
            note: '各variantの最適価格を確認し、必要に応じて価格一括更新APIを使用してください'
        });

    } catch (error) {
        console.error('❌ 価格計算エラー:', error);
        throw error;
    }
}

// レート制限: 5リクエスト/分（重い処理）
export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 5, windowMs: 60000 }
);
