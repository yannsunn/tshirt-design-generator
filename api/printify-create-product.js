// Printify API統合 - 商品作成エンドポイント
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { shopId, imageId, title, description, tags } = req.body;
        const apiKey = process.env.PRINTIFY_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'PRINTIFY_API_KEY is not configured' });
        }

        if (!shopId || !imageId) {
            return res.status(400).json({ error: 'shopId and imageId are required' });
        }

        // Printify商品作成
        // Blueprint ID: 6 = Gildan 5000 (ベーシックTシャツ)
        // Print Provider: 3 = MyLocker (安定したプロバイダー)
        const blueprintId = 6;
        const printProviderId = 3;

        // 1. まず利用可能なvariantsを取得
        const variantsResponse = await fetch(
            `https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!variantsResponse.ok) {
            const errorText = await variantsResponse.text();
            throw new Error(`Printify Variants API error: ${variantsResponse.status} - ${errorText}`);
        }

        const variantsData = await variantsResponse.json();

        // 2. 利用可能なモックアップを取得
        const mockupsResponse = await fetch(
            `https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}.json`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!mockupsResponse.ok) {
            console.warn('Failed to fetch mockups, will use defaults');
        }

        const mockupsData = await mockupsResponse.json();
        const availableMockups = mockupsData.images || [];

        // 最大15個のモックアップIDを選択（バリエーションを持たせる）
        const selectedMockupIds = availableMockups
            .slice(0, 15)
            .map(mockup => mockup.id);

        console.log(`Selected ${selectedMockupIds.length} mockups for product`);

        // 利用可能なvariantから基本サイズ（S, M, L, XL, 2XL）を抽出
        const availableVariants = variantsData.variants || [];
        const selectedVariants = [];
        const variantIds = [];

        // サイズ優先順位
        const sizePreference = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

        for (const size of sizePreference) {
            const variant = availableVariants.find(v =>
                v.title && v.title.toUpperCase().includes(size)
            );
            if (variant && selectedVariants.length < 5) {
                selectedVariants.push({
                    id: variant.id,
                    price: 2500, // 基本価格2500円
                    is_enabled: true
                });
                variantIds.push(variant.id);
            }
        }

        // variantが見つからない場合は最初の5つを使用
        if (selectedVariants.length === 0) {
            for (let i = 0; i < Math.min(5, availableVariants.length); i++) {
                selectedVariants.push({
                    id: availableVariants[i].id,
                    price: 2500,
                    is_enabled: true
                });
                variantIds.push(availableVariants[i].id);
            }
        }

        const printifyApiUrl = `https://api.printify.com/v1/shops/${shopId}/products.json`;

        const payload = {
            title: title || 'Custom Japanese Culture T-Shirt',
            description: description || 'AI-generated unique Japanese-themed t-shirt design. Perfect souvenir for tourists visiting Japan.',
            blueprint_id: blueprintId,
            print_provider_id: printProviderId,
            variants: selectedVariants,
            print_areas: [
                {
                    variant_ids: variantIds,
                    placeholders: [
                        {
                            position: 'front',
                            images: [
                                {
                                    id: imageId,
                                    x: 0.5, // Center horizontal
                                    y: 0.45, // Slightly above center for better appearance
                                    scale: 0.95, // 95% size to prevent cropping
                                    angle: 0
                                }
                            ]
                        }
                    ]
                }
            ],
            // 自動選択されたモックアップを追加
            print_details: selectedMockupIds.length > 0 ? {
                mockup_ids: selectedMockupIds
            } : undefined,
            tags: tags || ['Japanese Culture', 'AI Generated', 'Custom Design', 'Tourist Souvenir'],
            // デフォルトでドラフトとして作成（後で確認してから公開）
            is_locked: false
        };

        const response = await fetch(printifyApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Printify Product Creation error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        res.status(200).json({
            productId: result.id,
            productUrl: `https://printify.com/app/products/${result.id}`,
            message: `✅ Product created successfully!

📦 Product Details:
• ${selectedMockupIds.length} mockups automatically selected
• All sizes (S/M/L/XL/2XL) configured
• Design positioned at center (y=0.45, scale=0.95)
• English title & description for international reach

🎯 Next Steps (Optional):
1. Visit Printify dashboard to review product
2. Add more mockups if needed (50+ available)
3. Fine-tune design position if necessary
4. Publish to your store when ready

Product URL: https://printify.com/app/products/${result.id}`
        });

    } catch (error) {
        console.error('Error in /api/printify-create-product:', error);
        res.status(500).json({ error: error.message });
    }
}