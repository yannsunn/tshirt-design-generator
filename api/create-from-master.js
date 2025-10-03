// マスター商品から新しい商品を作成（モックアップ・配送設定を保持）
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);

    const { masterProductId, shopId, newImageUrl, title, description, tags } = req.body;
    const apiKey = process.env.PRINTIFY_API_KEY;

    if (!masterProductId || !shopId || !newImageUrl || !title) {
        return res.status(400).json({
            error: 'masterProductId, shopId, newImageUrl, and title are required'
        });
    }

    try {
        console.log('🎯 マスターから商品作成開始:', masterProductId);

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
        console.log('📤 新しい画像をアップロード中...');
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
                    url: newImageUrl
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

        // Step 3: マスター商品の構造をコピーして新しい商品データを作成
        const newProduct = {
            title: title,
            description: description || master.description || 'Japanese-inspired design T-shirt',
            blueprint_id: master.blueprint_id,
            print_provider_id: master.print_provider_id,
            variants: master.variants.map(v => ({
                id: v.id,
                price: v.price, // マスターの価格をそのまま使用（後で自動計算で更新可能）
                is_enabled: v.is_enabled
            })),
            print_areas: master.print_areas.map(area => ({
                variant_ids: area.variant_ids,
                placeholders: area.placeholders.map(placeholder => ({
                    position: placeholder.position,
                    images: [
                        {
                            id: newImageId, // 新しい画像IDに差し替え
                            x: placeholder.images[0]?.x || 0.5,
                            y: placeholder.images[0]?.y || 0.5,
                            scale: placeholder.images[0]?.scale || 1,
                            angle: placeholder.images[0]?.angle || 0
                        }
                    ]
                }))
            }))
        };

        // タグを追加（存在する場合）
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
            product: {
                id: createdProduct.id,
                title: createdProduct.title,
                blueprintId: createdProduct.blueprint_id,
                variants: createdProduct.variants?.length || 0,
                imageId: newImageId
            },
            message: `✅ マスターから商品を作成しました: ${createdProduct.title}`,
            masterProductId: masterProductId,
            masterTitle: master.title
        });

    } catch (error) {
        console.error('❌ マスターから商品作成エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 5, windowMs: 60000 }
);
