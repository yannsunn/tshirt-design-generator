// 既存Printify商品をマスターベースで再作成（バッチ処理）
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);

    const { shopId, offset = 0, limit = 5, deleteOld = false } = req.body;
    const apiKey = process.env.PRINTIFY_API_KEY;

    if (!shopId) {
        return res.status(400).json({ error: 'shopId is required' });
    }

    // Blueprint ID → マスター商品IDマッピング
    const blueprintToMaster = {
        6: '68dffaef951b5797930ad3fa',      // Gildan 5000
        26: '68dffca5f6f3f5439609a446',     // Gildan 980
        36: '68e00767f405aeee2807feaa',     // Gildan 2000
        145: '68dffe1ff1fe6779bb0cdfb1',    // Gildan 64000
        157: '68dfff12ccd7b22ae206682a',    // Gildan 5000B
        80: '68e0000eb4d1554d3906a4bc',     // Gildan 2400
        49: '68e0050d0515f444220525d7',     // Gildan 18000
        77: '68e006307bbf5c83180c5b45',     // Gildan 18500

        // 既存のカスタムBlueprint（マスター自体なので再作成不要）
        706: null,   // カスタムTシャツマスター
        1296: null   // カスタムスウェットマスター
    };

    try {
        console.log(`🔄 商品再作成開始: Shop ${shopId}, Offset ${offset}, Limit ${limit}`);

        // Step 1: 既存商品を取得
        const page = Math.floor(offset / 100) + 1;
        const productsResponse = await fetch(
            `https://api.printify.com/v1/shops/${shopId}/products.json?limit=100&page=${page}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!productsResponse.ok) {
            throw new Error(`Failed to fetch products: ${productsResponse.status}`);
        }

        const productsData = await productsResponse.json();
        const allProducts = productsData.data || [];

        // offsetとlimitで商品を絞り込み
        const startIndex = offset % 100;
        const targetProducts = allProducts.slice(startIndex, startIndex + limit);

        console.log(`📋 ${targetProducts.length}商品を処理対象として取得`);

        const results = [];
        let recreatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const product of targetProducts) {
            try {
                // [MASTER]商品はスキップ
                if (product.title && product.title.includes('[MASTER]')) {
                    console.log(`⏭️ スキップ（マスター商品）: ${product.title}`);
                    skippedCount++;
                    results.push({
                        oldProductId: product.id,
                        title: product.title,
                        status: 'skipped',
                        reason: 'Master product'
                    });
                    continue;
                }

                // Step 2: 商品の詳細を取得
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
                    throw new Error(`Failed to fetch product detail: ${detailResponse.status}`);
                }

                const detail = await detailResponse.json();
                const blueprintId = detail.blueprint_id;

                // 対応するマスター商品を確認
                if (!(blueprintId in blueprintToMaster)) {
                    console.log(`⏭️ スキップ（未対応Blueprint ${blueprintId}）: ${product.title}`);
                    skippedCount++;
                    results.push({
                        oldProductId: product.id,
                        title: product.title,
                        blueprintId: blueprintId,
                        status: 'skipped',
                        reason: `Unsupported blueprint: ${blueprintId}`
                    });
                    continue;
                }

                const masterProductId = blueprintToMaster[blueprintId];

                // 既存のカスタムBlueprint（706, 1296）はスキップ
                if (!masterProductId) {
                    console.log(`⏭️ スキップ（カスタムマスター）: ${product.title} (Blueprint ${blueprintId})`);
                    skippedCount++;
                    results.push({
                        oldProductId: product.id,
                        title: product.title,
                        blueprintId: blueprintId,
                        status: 'skipped',
                        reason: 'Custom master blueprint'
                    });
                    continue;
                }

                // 既存画像IDを取得
                const existingImageId = detail.images?.[0]?.id;
                if (!existingImageId) {
                    console.log(`⚠️ スキップ（画像なし）: ${product.title}`);
                    skippedCount++;
                    results.push({
                        oldProductId: product.id,
                        title: product.title,
                        status: 'skipped',
                        reason: 'No image found'
                    });
                    continue;
                }

                console.log(`🔨 再作成中: ${product.title} (Blueprint ${blueprintId} → Master ${masterProductId})`);

                // Step 3: マスター商品から新しい商品を作成
                const masterResponse = await fetch(
                    `https://api.printify.com/v1/shops/${shopId}/products/${masterProductId}.json`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!masterResponse.ok) {
                    throw new Error(`Failed to fetch master: ${masterResponse.status}`);
                }

                const master = await masterResponse.json();

                // 新しい商品データを作成
                const newProduct = {
                    title: detail.title,
                    description: detail.description || 'Japanese-inspired design',
                    blueprint_id: master.blueprint_id,
                    print_provider_id: master.print_provider_id,
                    variants: master.variants.map(v => ({
                        id: v.id,
                        price: v.price,
                        is_enabled: v.is_enabled
                    })),
                    print_areas: master.print_areas.map(area => ({
                        variant_ids: area.variant_ids,
                        placeholders: area.placeholders.map(placeholder => ({
                            position: placeholder.position,
                            images: [
                                {
                                    id: existingImageId, // 既存の画像IDを使用
                                    x: placeholder.images[0]?.x || 0.5,
                                    y: placeholder.images[0]?.y || 0.5,
                                    scale: placeholder.images[0]?.scale || 1,
                                    angle: placeholder.images[0]?.angle || 0
                                }
                            ]
                        }))
                    }))
                };

                // タグを継承
                if (detail.tags && detail.tags.length > 0) {
                    newProduct.tags = detail.tags;
                }

                // 新しい商品を作成
                const createResponse = await fetch(
                    `https://api.printify.com/v1/shops/${shopId}/products.json`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(newProduct)
                    }
                );

                const createResponseText = await createResponse.text();

                if (!createResponse.ok) {
                    throw new Error(`Failed to create product: ${createResponse.status} - ${createResponseText}`);
                }

                const createdProduct = JSON.parse(createResponseText);
                console.log(`✅ 再作成成功: ${createdProduct.title} (New ID: ${createdProduct.id})`);

                // Step 4: 古い商品を削除（オプション）
                let deleted = false;
                if (deleteOld) {
                    const deleteResponse = await fetch(
                        `https://api.printify.com/v1/shops/${shopId}/products/${product.id}.json`,
                        {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    if (deleteResponse.ok) {
                        console.log(`🗑️ 古い商品を削除: ${product.id}`);
                        deleted = true;
                    } else {
                        console.warn(`⚠️ 削除失敗: ${product.id}`);
                    }
                }

                recreatedCount++;
                results.push({
                    oldProductId: product.id,
                    newProductId: createdProduct.id,
                    title: detail.title,
                    blueprintId: blueprintId,
                    masterProductId: masterProductId,
                    status: 'success',
                    deleted: deleted
                });

                // レート制限対策
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`❌ エラー（${product.id}）:`, error.message);
                errorCount++;
                results.push({
                    oldProductId: product.id,
                    title: product.title,
                    status: 'error',
                    error: error.message
                });
            }
        }

        console.log(`📊 完了: 再作成${recreatedCount}件、スキップ${skippedCount}件、エラー${errorCount}件`);

        res.status(200).json({
            success: true,
            recreated: recreatedCount,
            skipped: skippedCount,
            errors: errorCount,
            total: targetProducts.length,
            offset: offset,
            limit: limit,
            hasMore: offset + limit < allProducts.length,
            nextOffset: offset + limit,
            results: results,
            message: `✅ ${recreatedCount}商品を再作成しました`
        });

    } catch (error) {
        console.error('❌ 再作成エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 3, windowMs: 60000 }
);
