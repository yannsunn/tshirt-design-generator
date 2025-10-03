// 既存マスター商品を参考に残りのBlueprint用マスター商品を自動作成
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);

    const { templateProductId, shopId, targetBlueprints } = req.body;
    const apiKey = process.env.PRINTIFY_API_KEY;

    if (!templateProductId) {
        return res.status(400).json({ error: 'templateProductId is required' });
    }

    if (!shopId) {
        return res.status(400).json({ error: 'shopId is required' });
    }

    // Blueprint IDとPrint Provider IDのマッピング
    const blueprintProviderMap = {
        6: { providerId: 99, name: 'Gildan 5000 T-Shirt (Basic)' },
        26: { providerId: 206, name: 'Gildan 980 Lightweight Tee' },
        36: { providerId: 21, name: 'Gildan 2000 Ultra Cotton Tee' },
        145: { providerId: 21, name: 'Gildan 64000 Softstyle T-Shirt' },
        157: { providerId: 21, name: 'Gildan 5000B Kids Tee' },
        80: { providerId: 21, name: 'Gildan 2400 Long Sleeve Tee' },
        49: { providerId: 21, name: 'Gildan 18000 Sweatshirt' },
        77: { providerId: 21, name: 'Gildan 18500 Hoodie' }
    };

    // 作成対象のBlueprint IDリスト（指定がなければ全部）
    const blueprintsToCreate = targetBlueprints || Object.keys(blueprintProviderMap).map(Number);

    try {
        console.log('📋 マスター商品自動作成開始');

        // テンプレート商品の詳細を取得
        const templateResponse = await fetch(
            `https://api.printify.com/v1/shops/${shopId}/products/${templateProductId}.json`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!templateResponse.ok) {
            const errorText = await templateResponse.text();
            throw new Error(`Failed to fetch template product: ${templateResponse.status} - ${errorText}`);
        }

        const template = await templateResponse.json();
        console.log(`✅ テンプレート商品取得: ${template.title} (Blueprint ${template.blueprint_id})`);

        const results = [];
        const createdProducts = [];

        // 既にテンプレートのBlueprintは持っているので、それ以外を作成
        for (const blueprintId of blueprintsToCreate) {
            if (parseInt(blueprintId) === template.blueprint_id) {
                console.log(`⏭️ スキップ: Blueprint ${blueprintId} (既にテンプレートとして存在)`);
                results.push({
                    blueprintId,
                    skipped: true,
                    reason: 'Already exists as template',
                    templateProductId: template.id
                });
                continue;
            }

            try {
                const blueprintInfo = blueprintProviderMap[blueprintId];
                if (!blueprintInfo) {
                    console.log(`⚠️ 不明なBlueprint ID: ${blueprintId}`);
                    continue;
                }

                console.log(`\n🔨 作成中: ${blueprintInfo.name} (Blueprint ${blueprintId})`);

                // 新しいBlueprintのバリアント情報を取得
                const variantsResponse = await fetch(
                    `https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers/${blueprintInfo.providerId}/variants.json`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!variantsResponse.ok) {
                    console.error(`❌ バリアント取得失敗: Blueprint ${blueprintId}`);
                    results.push({
                        blueprintId,
                        blueprintName: blueprintInfo.name,
                        error: 'Failed to fetch variants',
                        success: false
                    });
                    continue;
                }

                const variantsData = await variantsResponse.json();
                const availableVariants = variantsData.variants || [];

                // バリアントを準備（全サイズ・全カラーを有効化）
                const variants = availableVariants.map(variant => ({
                    id: variant.id,
                    price: 2500, // 仮の価格（後で自動計算）
                    is_enabled: true
                }));

                // テンプレート商品の画像を使用
                const imageId = template.images?.[0]?.id;
                if (!imageId) {
                    throw new Error('Template product has no images');
                }

                // 新しい商品を作成
                const newProduct = {
                    title: `[MASTER] ${blueprintInfo.name}`,
                    description: 'Master template - Do not publish. Auto-generated from template.',
                    blueprint_id: parseInt(blueprintId),
                    print_provider_id: blueprintInfo.providerId,
                    variants: variants,
                    print_areas: [
                        {
                            variant_ids: availableVariants.map(v => v.id),
                            placeholders: [
                                {
                                    position: 'front',
                                    images: [
                                        {
                                            id: imageId,
                                            x: 0.5,
                                            y: 0.5,
                                            scale: 1,
                                            angle: 0
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                };

                console.log(`📤 商品作成リクエスト送信...`);

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

                const responseText = await createResponse.text();
                console.log(`📡 レスポンス (${createResponse.status}):`, responseText.substring(0, 200));

                if (!createResponse.ok) {
                    let errorData;
                    try {
                        errorData = JSON.parse(responseText);
                    } catch {
                        errorData = { message: responseText };
                    }
                    throw new Error(`Failed to create product: ${JSON.stringify(errorData)}`);
                }

                const createdProduct = JSON.parse(responseText);
                console.log(`✅ 作成成功: ${blueprintInfo.name} (ID: ${createdProduct.id})`);

                createdProducts.push({
                    blueprintId,
                    blueprintName: blueprintInfo.name,
                    productId: createdProduct.id,
                    title: createdProduct.title
                });

                results.push({
                    blueprintId,
                    blueprintName: blueprintInfo.name,
                    productId: createdProduct.id,
                    success: true
                });

                // レート制限対策
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`❌ エラー (Blueprint ${blueprintId}):`, error.message);
                results.push({
                    blueprintId,
                    blueprintName: blueprintProviderMap[blueprintId]?.name || 'Unknown',
                    error: error.message,
                    success: false
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const skippedCount = results.filter(r => r.skipped).length;

        res.status(200).json({
            success: true,
            created: successCount,
            skipped: skippedCount,
            total: results.length,
            results,
            createdProducts,
            message: `✅ ${successCount}個のマスター商品を作成しました（${skippedCount}個スキップ）`
        });

    } catch (error) {
        console.error('❌ マスター商品作成エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 5, windowMs: 60000 }
);
