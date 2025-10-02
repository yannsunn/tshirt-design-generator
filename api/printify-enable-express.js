// Printify API統合 - Express設定一括有効化エンドポイント
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { shopId } = req.body;
        const apiKey = process.env.PRINTIFY_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'PRINTIFY_API_KEY is not configured' });
        }

        if (!shopId) {
            return res.status(400).json({ error: 'shopId is required' });
        }

        console.log(`🚀 Express設定一括有効化開始 (Shop ID: ${shopId})`);

        // 1. 全商品を取得
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
            throw new Error(`商品一覧取得エラー: ${productsResponse.status} - ${errorText}`);
        }

        const productsData = await productsResponse.json();
        const products = productsData.data || [];
        console.log(`📦 商品数: ${products.length}件`);

        // 2. Express対象商品を特定し、設定を有効化
        const results = [];
        let enabledCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const product of products) {
            try {
                // 商品詳細を取得してExpress eligibilityをチェック
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
                    throw new Error(`商品詳細取得失敗: ${detailResponse.status}`);
                }

                const productDetail = await detailResponse.json();

                // Express対象外、または既に有効の場合はスキップ
                if (!productDetail.is_printify_express_eligible) {
                    console.log(`⏭️  スキップ (Express非対応): ${product.title} (ID: ${product.id})`);
                    results.push({
                        id: product.id,
                        title: product.title,
                        status: 'skipped',
                        reason: 'Express非対応'
                    });
                    skippedCount++;
                    continue;
                }

                if (productDetail.is_printify_express_enabled) {
                    console.log(`⏭️  スキップ (既に有効): ${product.title} (ID: ${product.id})`);
                    results.push({
                        id: product.id,
                        title: product.title,
                        status: 'skipped',
                        reason: '既に有効'
                    });
                    skippedCount++;
                    continue;
                }

                // Express設定を有効化
                console.log(`⚡ Express有効化中: ${product.title} (ID: ${product.id})`);
                const updateResponse = await fetch(
                    `https://api.printify.com/v1/shops/${shopId}/products/${product.id}.json`,
                    {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            is_printify_express_enabled: true
                        })
                    }
                );

                if (!updateResponse.ok) {
                    const errorData = await updateResponse.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error(`Express設定失敗: ${errorData.error || updateResponse.statusText}`);
                }

                console.log(`✅ Express有効化成功: ${product.title}`);
                results.push({
                    id: product.id,
                    title: product.title,
                    status: 'enabled'
                });
                enabledCount++;

                // レート制限対策: 500ms待機
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`❌ エラー: ${product.title} - ${error.message}`);
                results.push({
                    id: product.id,
                    title: product.title,
                    status: 'error',
                    error: error.message
                });
                errorCount++;
            }
        }

        console.log(`\n🏁 完了: 有効化${enabledCount}件、スキップ${skippedCount}件、エラー${errorCount}件`);

        res.status(200).json({
            success: true,
            total: products.length,
            enabled: enabledCount,
            skipped: skippedCount,
            errors: errorCount,
            results: results,
            message: `✅ Express設定完了: ${enabledCount}件を有効化しました`
        });

    } catch (error) {
        console.error('Error in /api/printify-enable-express:', error);
        res.status(500).json({ error: error.message });
    }
}
