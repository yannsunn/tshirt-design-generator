// マスター商品を完全にゼロから自動作成（Blueprint情報のみから作成）
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { shopId } = req.body;
    const apiKey = process.env.PRINTIFY_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'PRINTIFY_API_KEY not configured' });
    }

    if (!shopId) {
        return res.status(400).json({ error: 'shopId is required' });
    }

    // Blueprint IDとPrint Provider IDのマッピング
    const blueprintConfigs = [
        { blueprintId: 6, printProviderId: 99, name: '[MASTER] Gildan 5000 T-Shirt', type: 'tshirt' },
        { blueprintId: 26, printProviderId: 206, name: '[MASTER] Gildan 980 Lightweight', type: 'lightweight_tee' },
        { blueprintId: 36, printProviderId: 21, name: '[MASTER] Gildan 2000 Ultra Cotton', type: 'ultra_cotton_tee' },
        { blueprintId: 145, printProviderId: 21, name: '[MASTER] Gildan 64000 Softstyle', type: 'softstyle_tee' },
        { blueprintId: 157, printProviderId: 21, name: '[MASTER] Gildan 5000B Kids Tee', type: 'kids_tee' },
        { blueprintId: 80, printProviderId: 21, name: '[MASTER] Gildan 2400 Long Sleeve', type: 'longsleeve' },
        { blueprintId: 49, printProviderId: 21, name: '[MASTER] Gildan 18000 Sweatshirt', type: 'sweatshirt' },
        { blueprintId: 77, printProviderId: 21, name: '[MASTER] Gildan 18500 Hoodie', type: 'hoodie' }
    ];

    const results = {
        created: [],
        failed: []
    };

    try {
        console.log(`🚀 マスター商品作成開始 (Shop: ${shopId})`);

        for (const config of blueprintConfigs) {
            try {
                console.log(`\n📦 作成中: ${config.name} (Blueprint ${config.blueprintId})`);

                // Step 1: Blueprint詳細を取得
                const blueprintResponse = await fetch(
                    `https://api.printify.com/v1/catalog/blueprints/${config.blueprintId}.json`,
                    {
                        headers: { 'Authorization': `Bearer ${apiKey}` }
                    }
                );

                if (!blueprintResponse.ok) {
                    throw new Error(`Blueprint取得失敗: ${blueprintResponse.status}`);
                }

                const blueprint = await blueprintResponse.json();

                // Step 2: Print Provider詳細を取得
                const providerResponse = await fetch(
                    `https://api.printify.com/v1/catalog/blueprints/${config.blueprintId}/print_providers/${config.printProviderId}.json`,
                    {
                        headers: { 'Authorization': `Bearer ${apiKey}` }
                    }
                );

                if (!providerResponse.ok) {
                    throw new Error(`Provider取得失敗: ${providerResponse.status}`);
                }

                const provider = await providerResponse.json();

                // Step 3: 商品作成用のペイロード構築
                const variants = provider.variants.map(variant => ({
                    id: variant.id,
                    price: 2999, // 仮の価格（後で価格計算APIで更新）
                    is_enabled: true
                }));

                // デフォルト画像を使用（白無地）
                const printAreas = {
                    front: blueprint.images[0]?.id || 'default'
                };

                const productPayload = {
                    title: config.name,
                    description: `Master product for ${config.type}`,
                    blueprint_id: config.blueprintId,
                    print_provider_id: config.printProviderId,
                    variants: variants,
                    print_areas: [
                        {
                            variant_ids: variants.map(v => v.id),
                            placeholders: [
                                {
                                    position: 'front',
                                    images: [
                                        {
                                            id: '507f191e810c19729de860ea', // ダミー画像ID（白無地）
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

                // Step 4: 商品を作成
                const createResponse = await fetch(
                    `https://api.printify.com/v1/shops/${shopId}/products.json`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(productPayload)
                    }
                );

                if (!createResponse.ok) {
                    const errorText = await createResponse.text();
                    throw new Error(`商品作成失敗: ${createResponse.status} - ${errorText}`);
                }

                const createdProduct = await createResponse.json();
                console.log(`✅ 作成成功: ${createdProduct.id}`);

                results.created.push({
                    type: config.type,
                    blueprintId: config.blueprintId,
                    productId: createdProduct.id,
                    name: config.name
                });

                // Rate limit対策
                await new Promise(resolve => setTimeout(resolve, 700));

            } catch (error) {
                console.error(`❌ 作成失敗: ${config.name}`, error.message);
                results.failed.push({
                    type: config.type,
                    blueprintId: config.blueprintId,
                    name: config.name,
                    error: error.message
                });
            }
        }

        console.log(`\n✅ マスター商品作成完了`);
        console.log(`   成功: ${results.created.length}件`);
        console.log(`   失敗: ${results.failed.length}件`);

        res.status(200).json({
            success: true,
            summary: {
                total: blueprintConfigs.length,
                created: results.created.length,
                failed: results.failed.length
            },
            results,
            message: `${results.created.length}件のマスター商品を作成しました`
        });

    } catch (error) {
        console.error('Error in /api/create-masters-from-scratch:', error);
        res.status(500).json({ error: error.message });
    }
}
