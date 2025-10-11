/**
 * 全商品の価格を38%マージン、$X.99形式に一括修正
 * レート制限: 90req/min (0.7秒間隔)
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.PRINTIFY_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'PRINTIFY_API_KEY not configured' });
    }

    try {
        const { shopId, dryRun = true, limit = 50 } = req.body;

        if (!shopId) {
            return res.status(400).json({ error: 'shopId is required' });
        }

        // USD $X.99 価格計算
        const JPY_TO_USD = 150;
        const TARGET_MARGIN = 38;

        const calculateOptimalPrice = (costJpy) => {
            const costUsd = costJpy / JPY_TO_USD;
            const exactPriceUsd = costUsd / (1 - TARGET_MARGIN / 100);

            // $X.99形式に調整（切り上げではなく、最も近い$X.99を選択）
            const floorPrice = Math.floor(exactPriceUsd);
            const ceilPrice = Math.ceil(exactPriceUsd);

            const floorPriceWith99 = floorPrice + 0.99;
            const ceilPriceWith99 = ceilPrice + 0.99;

            // 38%に最も近い価格を選択
            const marginFloor = ((floorPriceWith99 - costUsd) / floorPriceWith99) * 100;
            const marginCeil = ((ceilPriceWith99 - costUsd) / ceilPriceWith99) * 100;

            const priceUsd = (Math.abs(marginFloor - TARGET_MARGIN) < Math.abs(marginCeil - TARGET_MARGIN))
                ? floorPriceWith99
                : ceilPriceWith99;

            return Math.round(priceUsd * 100); // セント単位
        };

        // Blueprint原価データ
        const blueprintCosts = {
            6: { base: 900, sizes: { '2XL': 1200, '3XL': 1500 } },
            26: { base: 1050, sizes: { '2XL': 1350, '3XL': 1650 } },
            36: { base: 1200, sizes: { '2XL': 1500, '3XL': 1800 } },
            145: { base: 1050, sizes: { '2XL': 1350, '3XL': 1650 } },
            157: { base: 750, sizes: {} },
            80: { base: 1350, sizes: { '2XL': 1650, '3XL': 1950 } },
            49: { base: 2100, sizes: { '2XL': 2550, '3XL': 3000 } },
            77: { base: 2550, sizes: { '2XL': 3000, '3XL': 3450 } }
        };

        console.log(`🔧 価格修正開始: shopId=${shopId}, dryRun=${dryRun}`);

        // Step 1: 全商品を取得
        const productsResponse = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!productsResponse.ok) {
            throw new Error(`Failed to fetch products: ${productsResponse.status}`);
        }

        const productsResult = await productsResponse.json();
        const products = productsResult.data || [];
        const productsToFix = products.slice(0, limit);

        console.log(`📦 対象商品: ${productsToFix.length}件 / 全${products.length}件`);

        const results = {
            success: [],
            failed: [],
            skipped: []
        };

        // Step 2: 各商品の価格を修正
        for (let i = 0; i < productsToFix.length; i++) {
            const product = productsToFix[i];
            const blueprintId = product.blueprint_id;

            console.log(`\n[${i + 1}/${productsToFix.length}] ${product.title} (Blueprint ${blueprintId})`);

            // Blueprint原価データがない場合はスキップ
            if (!blueprintCosts[blueprintId]) {
                console.log(`⚠️ Blueprint ${blueprintId}の原価データなし - スキップ`);
                results.skipped.push({
                    id: product.id,
                    title: product.title,
                    reason: 'No blueprint cost data'
                });
                continue;
            }

            try {
                // 商品詳細を取得（variantの完全な情報が必要）
                const detailResponse = await fetch(
                    `https://api.printify.com/v1/shops/${shopId}/products/${product.id}.json`,
                    { headers: { 'Authorization': `Bearer ${apiKey}` } }
                );

                if (!detailResponse.ok) {
                    throw new Error(`Failed to fetch product detail: ${detailResponse.status}`);
                }

                const productDetail = await detailResponse.json();
                const variants = productDetail.variants || [];

                // 各variantの価格を計算
                const updatedVariants = variants.map(variant => {
                    const size = variant.title || 'Unknown';
                    const costJpy = blueprintCosts[blueprintId].sizes[size] || blueprintCosts[blueprintId].base;
                    const newPrice = calculateOptimalPrice(costJpy);

                    return {
                        id: variant.id,
                        price: newPrice,
                        is_enabled: variant.is_enabled
                    };
                });

                if (dryRun) {
                    console.log(`✅ ドライラン: ${updatedVariants.length}個のvariantを更新予定`);
                    results.success.push({
                        id: product.id,
                        title: product.title,
                        variants: updatedVariants.length,
                        dryRun: true
                    });
                } else {
                    // 実際に価格を更新
                    const updateResponse = await fetch(
                        `https://api.printify.com/v1/shops/${shopId}/products/${product.id}.json`,
                        {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                title: productDetail.title,
                                description: productDetail.description,
                                variants: updatedVariants
                            })
                        }
                    );

                    if (!updateResponse.ok) {
                        throw new Error(`Failed to update product: ${updateResponse.status}`);
                    }

                    console.log(`✅ 更新完了: ${updatedVariants.length}個のvariant`);
                    results.success.push({
                        id: product.id,
                        title: product.title,
                        variants: updatedVariants.length
                    });
                }

            } catch (error) {
                console.error(`❌ エラー: ${error.message}`);
                results.failed.push({
                    id: product.id,
                    title: product.title,
                    error: error.message
                });
            }

            // Rate limiting: 0.7秒間隔 (90req/min = 1.5req/sec)
            if (i < productsToFix.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 700));
            }
        }

        const summary = {
            total: productsToFix.length,
            success: results.success.length,
            failed: results.failed.length,
            skipped: results.skipped.length,
            dryRun: dryRun
        };

        console.log('\n📊 価格修正完了:');
        console.log(`  - 成功: ${summary.success}件`);
        console.log(`  - 失敗: ${summary.failed}件`);
        console.log(`  - スキップ: ${summary.skipped}件`);

        res.status(200).json({
            success: true,
            summary,
            results,
            message: dryRun
                ? `${summary.success}件の商品が修正対象です（ドライラン）`
                : `${summary.success}件の商品価格を修正しました`,
            note: dryRun ? 'dryRun=false で実際に修正します' : null
        });

    } catch (error) {
        console.error('Error in /api/fix-all-prices:', error);
        res.status(500).json({ error: error.message });
    }
}
