/**
 * 未出品商品のチェックと自動出品準備
 * - 価格確認（38%マージン、末尾$X.99）
 * - 未出品商品の特定
 * - 出品可否判定
 */

export default async function handler(req, res) {
    const apiKey = process.env.PRINTIFY_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'PRINTIFY_API_KEY not configured' });
    }

    try {
        const { shopId } = req.query;

        if (!shopId) {
            return res.status(400).json({ error: 'shopId is required' });
        }

        // 全商品を取得
        const response = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!response.ok) {
            throw new Error(`Printify API error: ${response.status}`);
        }

        const result = await response.json();
        const products = result.data || [];

        // Blueprint原価データ
        const blueprintCosts = {
            706: { base: 1241, sizes: { '2XL': 1367, '3XL': 1571, '4XL': 1766 } },
            1296: { base: 3064, sizes: { '2XL': 3548, '3XL': 4181 } },
            6: { base: 1167, sizes: { '2XL': 1544, '3XL': 1636, '4XL': 1636, '5XL': 1636 } },
            49: { base: 2230, sizes: {} },
            12: { base: 1636, sizes: { '2XL': 2039 } }
        };

        const unpublished = [];
        const invalidPrice = [];
        const readyToPublish = [];

        for (const product of products) {
            const blueprintId = product.blueprint_id;
            const isPublished = product.is_locked; // is_locked = true means published

            // 価格チェック
            const variants = product.variants || [];
            let hasInvalidPrice = false;
            let allPricesValid = true;

            for (const variant of variants) {
                const price = variant.price; // セント単位
                const cost = variant.cost || blueprintCosts[blueprintId]?.base || 0;

                // マージン計算
                const margin = cost > 0 ? ((price - cost) / price * 100) : 0;

                // 価格チェック: 38%マージン、末尾99セント
                const isMarginOk = margin >= 37.5 && margin <= 38.5; // 38% ± 0.5%
                const isPriceOk = (price % 100) === 99; // 末尾99セント

                if (!isMarginOk || !isPriceOk) {
                    hasInvalidPrice = true;
                    allPricesValid = false;
                }
            }

            // 未出品商品
            if (!isPublished) {
                const productInfo = {
                    id: product.id,
                    title: product.title,
                    blueprintId: blueprintId,
                    isPublished: false,
                    hasValidPrice: allPricesValid,
                    variantCount: variants.length
                };

                unpublished.push(productInfo);

                if (allPricesValid) {
                    readyToPublish.push(productInfo);
                } else {
                    invalidPrice.push(productInfo);
                }
            }
        }

        console.log(`📊 未出品商品: ${unpublished.length}件`);
        console.log(`✅ 出品準備完了: ${readyToPublish.length}件`);
        console.log(`❌ 価格要修正: ${invalidPrice.length}件`);

        res.status(200).json({
            summary: {
                total: products.length,
                unpublished: unpublished.length,
                readyToPublish: readyToPublish.length,
                invalidPrice: invalidPrice.length
            },
            unpublished,
            readyToPublish,
            invalidPrice
        });

    } catch (error) {
        console.error('Error in /api/check-unpublished-products:', error);
        res.status(500).json({ error: error.message });
    }
}
