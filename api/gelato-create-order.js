// Gelato注文作成API（テスト用）
// Note: Gelatoは注文ベースのシステムのため、実際の配送先情報が必要です
import { asyncHandler, validateRequired, validateEnv, ExternalAPIError } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['GELATO_API_KEY']);
    validateRequired(req.body, ['imageUrl', 'title']);

    const {
        imageUrl,
        title,
        description = '',
        productUid = 'apparel_product_unisex_regular_fit_t_shirt_jpa01_white', // Default t-shirt
        quantity = 1,
        shippingAddress = null,
        isDryRun = true // By default, create dry-run orders
    } = req.body;

    const apiKey = process.env.GELATO_API_KEY;

    try {
        console.log(`📦 Gelato注文作成開始: ${title}`);

        // Default shipping address (required for orders)
        const defaultShipping = shippingAddress || {
            firstName: 'Test',
            lastName: 'User',
            addressLine1: '123 Test Street',
            city: 'Tokyo',
            postCode: '100-0001',
            country: 'JP',
            email: 'test@example.com'
        };

        // Create order
        const orderData = {
            orderType: isDryRun ? 'draft' : 'order',
            orderReferenceId: `tshirt-${Date.now()}`,
            customerReferenceId: title,
            shippingAddress: defaultShipping,
            items: [
                {
                    productUid: productUid,
                    quantity: quantity,
                    files: [
                        {
                            url: imageUrl,
                            type: 'default'
                        }
                    ]
                }
            ]
        };

        console.log('📤 Gelato注文データ:', JSON.stringify(orderData, null, 2));

        const response = await fetch('https://order.gelatoapis.com/v3/orders', {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Gelato注文作成失敗:', response.status, errorText);
            throw new ExternalAPIError('Gelato', `Failed to create order (${response.status})`, errorText);
        }

        const result = await response.json();
        console.log('✅ Gelato注文作成成功:', result);

        res.status(200).json({
            success: true,
            orderId: result.orderId || result.id,
            orderData: result,
            message: `Gelato${isDryRun ? 'ドラフト' : ''}注文を作成しました`,
            note: isDryRun ? 'これはテスト注文です。実際の製造・配送は行われません。' : '注文が確定しました。製造・配送が開始されます。'
        });

    } catch (error) {
        console.error('❌ Gelato注文作成エラー:', error);
        throw error;
    }
}

export default asyncHandler(handler);
