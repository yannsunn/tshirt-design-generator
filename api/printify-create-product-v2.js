// Printify商品作成（マスター複製方式）
// モックアップ・配送設定を保持したまま、画像・タイトル・説明だけを差し替え

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { shopId, imageUrl, title, description, tags, productType = 'tshirt' } = req.body;
        const apiKey = process.env.PRINTIFY_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'PRINTIFY_API_KEY is not configured' });
        }

        if (!shopId || !imageUrl || !title) {
            return res.status(400).json({ error: 'shopId, imageUrl, and title are required' });
        }

        // マスター商品IDマッピング（あなたが作成した8つのマスター商品）
        const masterProductIds = {
            // Tシャツ系
            tshirt: '68dffaef951b5797930ad3fa',              // Blueprint 6: Gildan 5000
            lightweight_tee: '68dffca5f6f3f5439609a446',    // Blueprint 26: Gildan 980
            ultra_cotton_tee: '68e00767f405aeee2807feaa',   // Blueprint 36: Gildan 2000
            softstyle_tee: '68dffe1ff1fe6779bb0cdfb1',      // Blueprint 145: Gildan 64000
            kids_tee: '68dfff12ccd7b22ae206682a',           // Blueprint 157: Gildan 5000B

            // 長袖・スウェット
            longsleeve: '68e0000eb4d1554d3906a4bc',         // Blueprint 80: Gildan 2400
            sweatshirt: '68e0050d0515f444220525d7',         // Blueprint 49: Gildan 18000
            hoodie: '68e006307bbf5c83180c5b45'              // Blueprint 77: Gildan 18500
        };

        const masterProductId = masterProductIds[productType];
        if (!masterProductId) {
            const validTypes = Object.keys(masterProductIds).join(', ');
            return res.status(400).json({
                error: `Invalid productType: ${productType}. Valid types: ${validTypes}`
            });
        }

        console.log(`🎯 マスターから商品作成: ${productType} (Master ID: ${masterProductId})`);

        // Step 1: マスター商品の詳細を取得
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
            throw new Error(`Failed to fetch master product: ${masterResponse.status}`);
        }

        const master = await masterResponse.json();
        console.log(`✅ マスター商品取得: ${master.title} (Blueprint ${master.blueprint_id})`);

        // Step 2: 新しい画像をPrintifyにアップロード
        console.log('📤 画像アップロード中...');
        const uploadResponse = await fetch(
            `https://api.printify.com/v1/uploads/images.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file_name: `design_${Date.now()}.png`,
                    url: imageUrl
                })
            }
        );

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Image upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        const uploadedImage = await uploadResponse.json();
        const newImageId = uploadedImage.id;
        console.log(`✅ 画像アップロード完了: ${newImageId}`);

        // Step 3: マスターの構造をコピーして新しい商品データを作成
        const newProduct = {
            title: title,
            description: description || master.description || 'Japanese-inspired design',
            blueprint_id: master.blueprint_id,
            print_provider_id: master.print_provider_id,
            variants: master.variants.map(v => ({
                id: v.id,
                price: v.price, // マスターの価格を継承（後で価格自動計算APIで更新可能）
                is_enabled: v.is_enabled
            })),
            print_areas: master.print_areas.map(area => ({
                variant_ids: area.variant_ids,
                placeholders: area.placeholders.map(placeholder => ({
                    position: placeholder.position,
                    images: [
                        {
                            id: newImageId, // 新しい画像に差し替え
                            x: placeholder.images[0]?.x || 0.5,
                            y: placeholder.images[0]?.y || 0.5,
                            scale: placeholder.images[0]?.scale || 1,
                            angle: placeholder.images[0]?.angle || 0
                        }
                    ]
                }))
            }))
        };

        // タグを追加
        if (tags && tags.length > 0) {
            newProduct.tags = tags;
        }

        console.log('📦 新しい商品を作成中...');

        // Step 4: 新しい商品を作成
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

        if (!createResponse.ok) {
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch {
                errorData = { message: responseText };
            }
            console.error('❌ 商品作成失敗:', errorData);
            throw new Error(`Failed to create product: ${JSON.stringify(errorData)}`);
        }

        const createdProduct = JSON.parse(responseText);
        console.log(`✅ 商品作成成功: ${createdProduct.title} (ID: ${createdProduct.id})`);

        res.status(200).json({
            success: true,
            productId: createdProduct.id,
            title: createdProduct.title,
            blueprintId: createdProduct.blueprint_id,
            printProviderId: createdProduct.print_provider_id,
            variants: createdProduct.variants?.length || 0,
            imageId: newImageId,
            masterProductId: masterProductId,
            productType: productType,
            message: `✅ マスターから商品を作成しました: ${createdProduct.title}`
        });

    } catch (error) {
        console.error('❌ 商品作成エラー:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error',
            details: error.stack
        });
    }
}
