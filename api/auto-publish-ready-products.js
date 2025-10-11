/**
 * 出品準備完了商品の自動出品
 * - 38%マージン、末尾$X.99の商品のみ
 * - Printify StorefrontとeBayに出品
 */

export default async function handler(req, res) {
    const apiKey = process.env.PRINTIFY_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'PRINTIFY_API_KEY not configured' });
    }

    try {
        const { shopId, dryRun = true } = req.body;

        if (!shopId) {
            return res.status(400).json({ error: 'shopId is required' });
        }

        // 未出品商品をチェック
        const checkResponse = await fetch(
            `${req.headers.origin || 'https://design-generator-puce.vercel.app'}/api/check-unpublished-products?shopId=${shopId}`
        );

        if (!checkResponse.ok) {
            throw new Error('Failed to check unpublished products');
        }

        const checkResult = await checkResponse.json();
        const readyProducts = checkResult.readyToPublish || [];

        console.log(`📦 出品準備完了商品: ${readyProducts.length}件`);

        if (readyProducts.length === 0) {
            return res.status(200).json({
                success: true,
                message: '出品可能な商品がありません',
                published: 0,
                skipped: 0
            });
        }

        const results = {
            published: [],
            failed: [],
            skipped: []
        };

        // ドライランモード
        if (dryRun) {
            console.log('🔍 ドライランモード: 実際には出品しません');
            return res.status(200).json({
                dryRun: true,
                message: `${readyProducts.length}件の商品が出品可能です（ドライラン）`,
                readyProducts,
                note: 'dryRun=false で実際に出品します'
            });
        }

        // 実際に出品
        for (const product of readyProducts) {
            try {
                const publishResponse = await fetch(
                    `https://api.printify.com/v1/shops/${shopId}/products/${product.id}/publish.json`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            title: true,
                            description: true,
                            images: true,
                            variants: true,
                            tags: true,
                            keyFeatures: true,
                            shipping_template: true
                        })
                    }
                );

                if (publishResponse.ok) {
                    results.published.push({
                        id: product.id,
                        title: product.title
                    });
                    console.log(`✅ 出品成功: ${product.title}`);
                } else {
                    const errorText = await publishResponse.text();
                    results.failed.push({
                        id: product.id,
                        title: product.title,
                        error: errorText
                    });
                    console.error(`❌ 出品失敗: ${product.title} - ${errorText}`);
                }

                // レート制限対策: 1秒待機
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                results.failed.push({
                    id: product.id,
                    title: product.title,
                    error: error.message
                });
                console.error(`❌ エラー: ${product.title} - ${error.message}`);
            }
        }

        res.status(200).json({
            success: true,
            summary: {
                total: readyProducts.length,
                published: results.published.length,
                failed: results.failed.length
            },
            results
        });

    } catch (error) {
        console.error('Error in /api/auto-publish-ready-products:', error);
        res.status(500).json({ error: error.message });
    }
}
