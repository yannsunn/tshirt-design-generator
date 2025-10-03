// Blueprint 706と1296の原価を調査するAPI
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);

    const { productId, shopId } = req.body;
    const apiKey = process.env.PRINTIFY_API_KEY;

    if (!productId || !shopId) {
        return res.status(400).json({ error: 'productId and shopId are required' });
    }

    try {
        console.log('💰 Blueprint原価調査開始:', productId);

        // 商品詳細を取得
        const response = await fetch(
            `https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch product: ${response.status}`);
        }

        const product = await response.json();

        // バリアントの原価情報を抽出
        const variantCosts = product.variants.map(variant => ({
            id: variant.id,
            title: variant.title,
            price: variant.price, // 販売価格（セント）
            cost: variant.cost, // 原価（セント、存在する場合）
            sku: variant.sku,
            is_enabled: variant.is_enabled
        }));

        // サイズごとの原価を集計
        const costsBySize = {};
        variantCosts.forEach(variant => {
            // タイトルからサイズを抽出（例: "Black / S" -> "S"）
            const sizeMatch = variant.title.match(/\/(.*?)$/);
            const size = sizeMatch ? sizeMatch[1].trim() : 'Unknown';

            if (!costsBySize[size]) {
                costsBySize[size] = {
                    size: size,
                    costs: [],
                    minCost: Infinity,
                    maxCost: 0
                };
            }

            if (variant.cost) {
                costsBySize[size].costs.push(variant.cost);
                costsBySize[size].minCost = Math.min(costsBySize[size].minCost, variant.cost);
                costsBySize[size].maxCost = Math.max(costsBySize[size].maxCost, variant.cost);
            }
        });

        // 基準原価を計算（最も一般的なサイズの原価）
        const sizeOrder = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
        let baseCost = null;
        const extraCosts = {};

        for (const size of sizeOrder) {
            if (costsBySize[size] && costsBySize[size].minCost !== Infinity) {
                if (!baseCost && ['S', 'M', 'L'].includes(size)) {
                    baseCost = costsBySize[size].minCost;
                } else if (baseCost && costsBySize[size].minCost > baseCost) {
                    extraCosts[size] = costsBySize[size].minCost;
                }
            }
        }

        // 結果をまとめる
        const result = {
            productId: product.id,
            title: product.title,
            blueprintId: product.blueprint_id,
            printProviderId: product.print_provider_id,
            totalVariants: variantCosts.length,
            costAnalysis: {
                baseCost: baseCost,
                extraCosts: extraCosts,
                costsBySize: Object.values(costsBySize).map(s => ({
                    size: s.size,
                    minCost: s.minCost === Infinity ? null : s.minCost,
                    maxCost: s.maxCost || null,
                    avgCost: s.costs.length > 0 ? Math.round(s.costs.reduce((a, b) => a + b, 0) / s.costs.length) : null
                }))
            },
            suggestedConfig: baseCost ? {
                blueprintId: product.blueprint_id,
                baseCost: baseCost,
                extraCost: extraCosts,
                name: product.title
            } : null
        };

        console.log('✅ 原価分析完了');

        res.status(200).json({
            success: true,
            result: result,
            message: '✅ Blueprint原価を分析しました'
        });

    } catch (error) {
        console.error('❌ Blueprint原価調査エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 10, windowMs: 60000 }
);
