// Printify商品の最適価格を計算（38%利益率を達成）
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv, ExternalAPIError } from '../lib/errorHandler.js';
import { analyzeProductPricing } from '../services/price-calculator.js';
import { PRICING_CONFIG } from '../config/pricing-config.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);

    const { shopId, targetMargin = PRICING_CONFIG.DEFAULT_TARGET_MARGIN } = req.body;

    if (!shopId) {
        return res.status(400).json({ error: 'shopId is required' });
    }

    const apiKey = process.env.PRINTIFY_API_KEY;

    try {
        console.log(`📊 最適価格計算開始: 目標利益率${targetMargin}%`);

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

        console.log(`✅ ${allProducts.length}商品を取得`);

        const results = [];
        let needsUpdate = 0;
        let optimal = 0;

        // 2. 各商品の価格を分析
        for (const product of allProducts) {
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

                // 価格分析サービスを使用
                const analysis = analyzeProductPricing(detail, targetMargin);

                results.push(analysis);

                if (analysis.needsUpdate) {
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
                total: allProducts.length,
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
