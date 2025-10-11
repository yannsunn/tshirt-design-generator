/**
 * 全商品削除API
 * レート制限対応（90req/min）
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
        const { shopId, dryRun = true } = req.body;

        if (!shopId) {
            return res.status(400).json({ error: 'shopId is required' });
        }

        // 全商品取得
        const response = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch products: ${response.status}`);
        }

        const result = await response.json();
        const products = result.data || [];

        console.log(`📦 対象商品: ${products.length}件`);

        if (dryRun) {
            return res.status(200).json({
                dryRun: true,
                message: `${products.length}件の商品が削除対象です（ドライラン）`,
                products: products.map(p => ({ id: p.id, title: p.title })),
                note: 'dryRun=false で実際に削除します'
            });
        }

        // 実際に削除
        const results = {
            deleted: [],
            failed: []
        };

        for (let i = 0; i < products.length; i++) {
            const product = products[i];

            try {
                const deleteResponse = await fetch(
                    `https://api.printify.com/v1/shops/${shopId}/products/${product.id}.json`,
                    {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${apiKey}` }
                    }
                );

                if (deleteResponse.ok) {
                    console.log(`✓ [${i + 1}/${products.length}] Deleted: ${product.title}`);
                    results.deleted.push({ id: product.id, title: product.title });
                } else {
                    throw new Error(`Delete failed: ${deleteResponse.status}`);
                }
            } catch (error) {
                console.error(`✗ [${i + 1}/${products.length}] Failed: ${product.title}`, error.message);
                results.failed.push({ id: product.id, title: product.title, error: error.message });
            }

            // Rate limiting: 0.7秒間隔
            if (i < products.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 700));
            }
        }

        res.status(200).json({
            success: true,
            summary: {
                total: products.length,
                deleted: results.deleted.length,
                failed: results.failed.length
            },
            results,
            message: `${results.deleted.length}件の商品を削除しました`
        });

    } catch (error) {
        console.error('Error in /api/delete-all-products:', error);
        res.status(500).json({ error: error.message });
    }
}
