// SUZURI API - 一括商品作成（既存デザインからSUZURI商品を作成）
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv, ExternalAPIError } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['SUZURI_ACCESS_TOKEN']);

    const { imageUrl, title, description = null, createTshirt = true, createHoodie = true, createSweatshirt = true, published = false } = req.body;

    if (!imageUrl || !title) {
        return res.status(400).json({ error: 'imageUrl and title are required' });
    }

    const accessToken = process.env.SUZURI_ACCESS_TOKEN;

    try {
        console.log(`🚀 SUZURI一括商品作成: ${title}`);

        // Step 1: Create Material (画像アップロード)
        console.log('📤 Material作成中...');
        const materialBody = {
            texture: imageUrl,
            title: title
        };

        // 商品説明が提供されている場合は追加
        if (description) {
            materialBody.description = description;
        }

        const materialResponse = await fetch('https://suzuri.jp/api/v1/materials', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(materialBody)
        });

        if (!materialResponse.ok) {
            const errorText = await materialResponse.text();
            throw new ExternalAPIError('SUZURI', `Material作成失敗 (${materialResponse.status})`, errorText);
        }

        const material = await materialResponse.json();
        const materialId = material.id;
        console.log(`✅ Material作成成功: ID ${materialId}`);

        // Step 2: Create Products from Material
        const products = [];
        const itemTypes = [];

        if (createTshirt) itemTypes.push({ id: 1, name: 'Tシャツ' });
        if (createHoodie) itemTypes.push({ id: 2, name: 'パーカー' });
        if (createSweatshirt) itemTypes.push({ id: 3, name: 'スウェット' });

        console.log(`📦 ${itemTypes.length}種類の商品を作成中...`);

        for (const itemType of itemTypes) {
            try {
                await new Promise(resolve => setTimeout(resolve, 500)); // レート制限対策

                const productResponse = await fetch(`https://suzuri.jp/api/v1/materials/${materialId}/products`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        itemId: itemType.id,
                        published: published  // デフォルト: false（下書き状態）
                    })
                });

                if (!productResponse.ok) {
                    console.error(`⚠️ ${itemType.name}作成失敗`);
                    continue;
                }

                const product = await productResponse.json();
                products.push({
                    productId: product.id,
                    itemType: itemType.name,
                    status: 'created'
                });

                console.log(`✅ ${itemType.name}作成成功: ID ${product.id}`);

            } catch (error) {
                console.error(`❌ ${itemType.name}作成エラー:`, error.message);
                products.push({
                    itemType: itemType.name,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        const successCount = products.filter(p => p.status === 'created').length;
        console.log(`\n✅ SUZURI一括作成完了: ${successCount}/${itemTypes.length}件成功`);

        res.status(200).json({
            success: true,
            materialId: materialId,
            productsCreated: successCount,
            productsTotal: itemTypes.length,
            products: products,
            message: published
                ? `SUZURI商品を${successCount}件作成・公開しました`
                : `SUZURI商品を${successCount}件作成しました（下書き状態）`,
            note: published
                ? null
                : 'トリブン（利益）を設定してから、SUZURI管理画面で公開してください',
            suzuriUrl: `https://suzuri.jp/`
        });

    } catch (error) {
        console.error('❌ SUZURI一括作成エラー:', error);
        throw error;
    }
}

// レート制限: 5リクエスト/分（重い処理）
export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 5, windowMs: 60000 }
);
