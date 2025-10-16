// Printify商品作成（マスター複製方式）
// モックアップ・配送設定を保持したまま、画像・タイトル・説明だけを差し替え

import { calculateVariantPrice } from '../lib/blueprintCosts.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { shopId, imageId, imageUrl, title, description, tags, productType = 'tshirt' } = req.body;
        const apiKey = process.env.PRINTIFY_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'PRINTIFY_API_KEY is not configured' });
        }

        if (!shopId || (!imageId && !imageUrl) || !title) {
            return res.status(400).json({ error: 'shopId, (imageId or imageUrl), and title are required' });
        }

        // ショップごとのマスター商品IDマッピング（2025-10-13 更新）
        const masterProductIdsByShop = {
            // Storefront (24565480)
            '24565480': {
                tshirt: '68eb804da0786662a60357d9',              // Blueprint 6: Gildan 5000
                lightweight_tee: '68eb8052aa2890fa97097970',    // Blueprint 26: Gildan 980
                ultra_cotton_tee: '68eb8054a0786662a60357da',   // Blueprint 36: Gildan 2000
                softstyle_tee: '68eb8059aa2890fa97097974',      // Blueprint 145: Gildan 64000
                kids_tee: '68eb805da0c8ed2f2c0f0314',           // Blueprint 157: Gildan 5000B
                longsleeve: '68eb8060ff3c0ac2d50ebd3f',         // Blueprint 80: Gildan 2400
                sweatshirt: '68eb8063a0786662a60357dd',         // Blueprint 49: Gildan 18000
                hoodie: '68eb8068cb19b441780df848'              // Blueprint 77: Gildan 18500
            },
            // Etsy (24566474) - 2025-10-13 作成
            '24566474': {
                tshirt: '68ecbc2d9b2784f69609fbb2',              // Blueprint 6: Gildan 5000
                lightweight_tee: '68ecbc3450cf7a91a708a955',    // Blueprint 26: Gildan 980
                ultra_cotton_tee: '68ecbc38a70adcc57007a702',   // Blueprint 36: Gildan 2000
                softstyle_tee: '68ecbc3ebe92a956c70d0fef',      // Blueprint 145: Gildan 64000
                kids_tee: '68ecbc2450cf7a91a708a950',           // Blueprint 157: Gildan 5000B
                longsleeve: '68ecbc1fc26025d416096772',         // Blueprint 80: Gildan 2400
                sweatshirt: '68ecbc15c26025d416096770',         // Blueprint 49: Gildan 18000
                hoodie: '68ecbc1250cf7a91a708a948'              // Blueprint 77: Gildan 18500
            },
            // eBay/Samurai (24566516) - 2025-10-13 作成
            '24566516': {
                tshirt: '68ec85bca0c8ed2f2c0f46f4',              // Blueprint 6: Gildan 5000
                lightweight_tee: '68ec85c3f88f52634a110f14',    // Blueprint 26: Gildan 980
                ultra_cotton_tee: '68ec85c70bb1a283330f8853',   // Blueprint 36: Gildan 2000
                softstyle_tee: '68ec85cdf92e58591d05d3c1',      // Blueprint 145: Gildan 64000
                kids_tee: '68ec85b5a0c8ed2f2c0f46f1',           // Blueprint 157: Gildan 5000B
                longsleeve: '68ec85afa0786662a6039bcc',         // Blueprint 80: Gildan 2400
                sweatshirt: '68ec85abff3c0ac2d50f018a',         // Blueprint 49: Gildan 18000
                hoodie: '68ec85a5a0c8ed2f2c0f46e9'              // Blueprint 77: Gildan 18500
            }
        };

        // ショップIDに応じたマスター商品IDを取得
        const masterProductIds = masterProductIdsByShop[shopId];

        if (!masterProductIds) {
            const availableShops = Object.keys(masterProductIdsByShop).join(', ');
            console.error(`❌ Shop ${shopId} はマスター商品マッピングに含まれていません`);
            console.error(`   利用可能なショップ: ${availableShops}`);
            return res.status(400).json({
                error: `Shop ${shopId} のマスター商品が未設定です。利用可能なショップ: ${availableShops}`,
                availableShops: Object.keys(masterProductIdsByShop)
            });
        }

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
            const errorText = await masterResponse.text();
            console.error(`❌ マスター商品取得失敗 (${masterResponse.status}):`, errorText);
            console.error(`   Shop: ${shopId}, ProductType: ${productType}, MasterID: ${masterProductId}`);
            throw new Error(`Failed to fetch master product: ${masterResponse.status} - ${errorText.substring(0, 200)}`);
        }

        const master = await masterResponse.json();
        console.log(`✅ マスター商品取得: ${master.title} (Blueprint ${master.blueprint_id})`);

        // Step 2: 画像IDを取得（既存IDまたは新規アップロード）
        let newImageId;

        if (imageId) {
            // 既にアップロード済みの画像IDを使用
            newImageId = imageId;
            console.log(`✅ 既存の画像IDを使用: ${newImageId}`);
        } else if (imageUrl) {
            // 新しい画像をPrintifyにアップロード
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
            newImageId = uploadedImage.id;
            console.log(`✅ 画像アップロード完了: ${newImageId}`);
        } else {
            throw new Error('Either imageId or imageUrl must be provided');
        }

        // Step 3: マスターの構造をコピーして新しい商品データを作成
        const newProduct = {
            title: title,
            description: description || master.description || 'Japanese-inspired design',
            blueprint_id: master.blueprint_id,
            print_provider_id: master.print_provider_id,
            variants: master.variants.map(v => {
                // 正しい価格を自動計算（38%利益率）
                const optimalPrice = calculateVariantPrice(master.blueprint_id, v.title || '', 38);
                return {
                    id: v.id,
                    price: optimalPrice || v.price, // 計算できない場合のみマスター価格を使用
                    is_enabled: v.is_enabled
                };
            }),
            print_areas: master.print_areas.map(area => {
                // 前面（front）のみにプリント
                const frontPlaceholders = area.placeholders
                    .filter(placeholder => placeholder.position === 'front' && placeholder.images && placeholder.images.length > 0)
                    .map(placeholder => ({
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
                    }));

                return {
                    variant_ids: area.variant_ids,
                    placeholders: frontPlaceholders
                };
            }).filter(area => area.placeholders.length > 0) // 空のprint_areaを除外
        };

        // タグを追加
        if (tags && tags.length > 0) {
            newProduct.tags = tags;
        }

        // SKUを追加（商品管理用）
        // フォーマット: SHOP-PRODUCTTYPE-TIMESTAMP
        const shopPrefix = {
            '24565480': 'STF',  // Storefront
            '24566474': 'ETY',  // Etsy
            '24566516': 'EBY'   // eBay
        };
        const sku = `${shopPrefix[shopId] || 'UNK'}-${productType.toUpperCase()}-${Date.now()}`;

        // バリアントにSKUを追加
        newProduct.variants = newProduct.variants.map((v, index) => ({
            ...v,
            sku: `${sku}-${index + 1}`
        }));

        // Printify Express配送を有効化（より速い配送）
        newProduct.is_printify_express_enabled = true;

        console.log('📦 新しい商品を作成中...');
        console.log(`   SKU: ${sku}`);

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
            console.error(`   Shop: ${shopId}, ProductType: ${productType}, MasterID: ${masterProductId}`);
            console.error(`   Title: ${title}`);
            console.error(`   ImageID: ${newImageId}`);
            throw new Error(`Failed to create product: ${JSON.stringify(errorData)}`);
        }

        const createdProduct = JSON.parse(responseText);
        console.log(`✅ 商品作成成功: ${createdProduct.title} (ID: ${createdProduct.id})`);

        // Step 5: 自動公開（Storefront / eBay / SUZURI のみ）
        // Etsyは手数料があるため手動公開
        const autoPublishShops = ['24565480', '24566516']; // Storefront, eBay
        let publishStatus = 'draft'; // デフォルトは下書き

        if (autoPublishShops.includes(shopId)) {
            try {
                console.log('📤 商品を自動公開中...');
                const publishResponse = await fetch(
                    `https://api.printify.com/v1/shops/${shopId}/products/${createdProduct.id}/publish.json`,
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
                    const publishResult = await publishResponse.json();
                    console.log(`✅ 商品公開成功: ${createdProduct.id}`);
                    publishStatus = 'published';
                } else {
                    const publishError = await publishResponse.text();
                    console.error(`⚠️ 商品公開失敗 (手動で公開が必要): ${publishError}`);
                    publishStatus = 'publish_failed';
                }
            } catch (publishError) {
                console.error(`⚠️ 公開エラー (手動で公開が必要):`, publishError);
                publishStatus = 'publish_error';
            }
        } else {
            console.log(`ℹ️ このショップ (${shopId}) は手動公開設定です`);
        }

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
            publishStatus: publishStatus,
            message: `✅ マスターから商品を作成しました: ${createdProduct.title}${publishStatus === 'published' ? ' (公開済み)' : ''}`
        });

    } catch (error) {
        console.error('❌ 商品作成エラー:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error',
            details: error.stack
        });
    }
}
