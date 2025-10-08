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

        // Blueprint IDごとの原価マッピング (実際のPrintify原価、セント単位)
        // 2025年10月時点の実測値
        const blueprintCosts = {
            // ユーザーカスタムマスター商品（優先）
            706: { baseCost: 1241, extraCost: { '2XL': 1367, '3XL': 1571, '4XL': 1766 } },
            1296: { baseCost: 3064, extraCost: { '2XL': 3548, '3XL': 4181 } },

            // 標準Blueprint（参考用）
            6: { baseCost: 1167, extraCost: { '2XL': 1544, '3XL': 1636, '4XL': 1636, '5XL': 1636 } },
            26: { baseCost: 1480, extraCost: { '2XL': 1987, '3XL': 2414 } },
            36: { baseCost: 1195, extraCost: { '2XL': 1557, '3XL': 1810, '4XL': 1802, '5XL': 1800 } },
            145: { baseCost: 1192, extraCost: { '2XL': 1457, '3XL': 1743 } },
            157: { baseCost: 1093, extraCost: {} },
            80: { baseCost: 2089, extraCost: {} },
            49: { baseCost: 2230, extraCost: {} },
            77: { baseCost: 2847, extraCost: { '2XL': 3208, '3XL': 3615, '4XL': 3615, '5XL': 3615 } },

            // Bella+Canvas
            5: { baseCost: 1233, extraCost: { '2XL': 1544, '3XL': 1636, '4XL': 1636 } },
            384: { baseCost: 2587, extraCost: { '2XL': 3193, '3XL': 3592 } },

            // Comfort Colors
            903: { baseCost: 1636, extraCost: { '2XL': 2039, '3XL': 2131 } },

            // Next Level
            12: { baseCost: 1636, extraCost: { '2XL': 2039 } },

            // District
            380: { baseCost: 1233, extraCost: { '2XL': 1544, '3XL': 1636, '4XL': 1636 } }
        };

        // 1. 全商品を取得（ページネーション対応）
        console.log('📋 商品リストを取得中...');
        let allProducts = [];
        let currentPage = 1;
        let hasMorePages = true;

        while (hasMorePages) {
            const productsResponse = await fetch(
                `https://api.printify.com/v1/shops/${shopId}/products.json?limit=50&page=${currentPage}`,
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
            const pageProducts = productsData.data || [];
            allProducts = allProducts.concat(pageProducts);

            console.log(`📄 ページ${currentPage}: ${pageProducts.length}件取得`);

            hasMorePages = pageProducts.length === 50;
            currentPage++;

            if (hasMorePages) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        const products = allProducts;
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
                    const size = variantTitle.match(/\b(2XL|3XL|4XL|5XL)\b/)?.[1];
                    const cost = size && costInfo.extraCost[size]
                        ? costInfo.extraCost[size]
                        : costInfo.baseCost;

                    const currentPrice = variant.price || 0;
                    const currentCostUsd = cost / 100;
                    const currentPriceUsd = currentPrice / 100;
                    const currentProfit = currentPriceUsd - currentCostUsd;
                    const actualMargin = currentPrice > 0 ? (currentProfit / currentPriceUsd) * 100 : 0;

                    // 目標利益率を達成する最適価格を計算（USD $X.99）
                    const costUsd = cost / 100;
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
