// マスター商品を完全再作成（ダミー画像付き）
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

    // 白無地のダミー画像（1x1ピクセルの透明PNG、Base64）
    const dummyImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

    // Blueprint設定
    const blueprintConfigs = [
        { blueprintId: 6, printProviderId: 99, name: '[MASTER] Gildan 5000 T-Shirt', type: 'tshirt' },
        { blueprintId: 26, printProviderId: 99, name: '[MASTER] Gildan 980 Lightweight', type: 'lightweight_tee' },
        { blueprintId: 36, printProviderId: 99, name: '[MASTER] Gildan 2000 Ultra Cotton', type: 'ultra_cotton_tee' },
        { blueprintId: 145, printProviderId: 99, name: '[MASTER] Gildan 64000 Softstyle', type: 'softstyle_tee' },
        { blueprintId: 157, printProviderId: 99, name: '[MASTER] Gildan 5000B Kids Tee', type: 'kids_tee' },
        { blueprintId: 80, printProviderId: 99, name: '[MASTER] Gildan 2400 Long Sleeve', type: 'longsleeve' },
        { blueprintId: 49, printProviderId: 99, name: '[MASTER] Gildan 18000 Sweatshirt', type: 'sweatshirt' },
        { blueprintId: 77, printProviderId: 99, name: '[MASTER] Gildan 18500 Hoodie', type: 'hoodie' }
    ];

    const results = {
        created: [],
        failed: []
    };

    try {
        console.log(`🚀 マスター商品再作成開始 (Shop: ${shopId})`);

        // Step 1: ダミー画像を1回だけアップロード
        console.log('📤 ダミー画像アップロード中...');
        const uploadResponse = await fetch(
            `https://api.printify.com/v1/uploads/images.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file_name: 'master_dummy.png',
                    contents: dummyImageBase64
                })
            }
        );

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`画像アップロード失敗: ${uploadResponse.status} - ${errorText}`);
        }

        const uploadedImage = await uploadResponse.json();
        const dummyImageId = uploadedImage.id;
        console.log(`✅ ダミー画像ID: ${dummyImageId}`);

        // Step 2: 各Blueprintでマスター商品を作成
        for (const config of blueprintConfigs) {
            try {
                console.log(`\n📦 作成中: ${config.name}`);

                // Variants取得
                const variantsResponse = await fetch(
                    `https://api.printify.com/v1/catalog/blueprints/${config.blueprintId}/print_providers/${config.printProviderId}/variants.json`,
                    {
                        headers: { 'Authorization': `Bearer ${apiKey}` }
                    }
                );

                if (!variantsResponse.ok) {
                    throw new Error(`Variants取得失敗: ${variantsResponse.status}`);
                }

                const variantsData = await variantsResponse.json();

                // 商品ペイロード作成
                const variants = variantsData.variants.map(v => ({
                    id: v.id,
                    price: 2999,
                    is_enabled: true
                }));

                const productPayload = {
                    title: config.name,
                    description: `Master template for ${config.type}`,
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
                                            id: dummyImageId,
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

                // 商品作成
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
                console.error(`❌ ${config.name} 失敗:`, error.message);
                results.failed.push({
                    type: config.type,
                    blueprintId: config.blueprintId,
                    name: config.name,
                    error: error.message
                });
            }
        }

        console.log(`\n✅ マスター商品再作成完了`);
        console.log(`   成功: ${results.created.length}件`);
        console.log(`   失敗: ${results.failed.length}件`);

        // 成功したマスター商品のIDマッピングを表示
        if (results.created.length > 0) {
            console.log('\n📋 新しいマスターID:');
            results.created.forEach(item => {
                console.log(`   ${item.type}: ${item.productId}`);
            });
        }

        res.status(200).json({
            success: true,
            summary: {
                total: blueprintConfigs.length,
                created: results.created.length,
                failed: results.failed.length
            },
            results,
            message: `${results.created.length}件のマスター商品を作成しました`,
            masterIds: results.created.reduce((acc, item) => {
                acc[item.type] = item.productId;
                return acc;
            }, {})
        });

    } catch (error) {
        console.error('Error in /api/recreate-masters-complete:', error);
        res.status(500).json({ error: error.message });
    }
}
