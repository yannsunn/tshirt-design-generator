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
        // Print Provider: 99 = Monster Digital (高品質DTG)
        const printifyApiUrl = `https://api.printify.com/v1/shops/${shopId}/products.json`;

        const payload = {
            title: title || 'カスタムTシャツデザイン',
            description: description || 'AI生成デザインのオリジナルTシャツ',
            blueprint_id: 6, // Gildan 5000
            print_provider_id: 99, // Monster Digital
            variants: [
                { id: 4011, price: 2500, is_enabled: true }, // S
                { id: 4012, price: 2500, is_enabled: true }, // M
                { id: 4013, price: 2500, is_enabled: true }, // L
                { id: 4014, price: 2500, is_enabled: true }, // XL
                { id: 4015, price: 2700, is_enabled: true }  // 2XL
            ],
            print_areas: [
                {
                    variant_ids: [4011, 4012, 4013, 4014, 4015],
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
            ],
            tags: tags || ['カスタム', 'AI生成', 'オリジナル']
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
            message: '商品の作成に成功しました！Printifyダッシュボードで確認できます。'
        });

    } catch (error) {
        console.error('Error in /api/printify-create-product:', error);
        res.status(500).json({ error: error.message });
    }
}