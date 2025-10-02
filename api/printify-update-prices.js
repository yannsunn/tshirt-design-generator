// Printify API統合 - 既存商品の価格一括更新エンドポイント
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateRequired, validateEnv, ExternalAPIError } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Validate environment variables
    validateEnv(['PRINTIFY_API_KEY']);

    // Validate required fields
    validateRequired(req.body, ['shopId']);

    const { shopId } = req.body;
    const apiKey = process.env.PRINTIFY_API_KEY;

        // Blueprint IDから商品タイプと価格を判定
        const blueprintToPriceMap = {
            // Tシャツ系
            6: { type: 'tshirt', price: 2500, name: 'Gildan 5000 T-Shirt' },
            26: { type: 'lightweight_tee', price: 2700, name: 'Gildan 980 Lightweight Fashion Tee' },
            36: { type: 'ultra_cotton_tee', price: 2800, name: 'Gildan 2000 Ultra Cotton Tee' },
            145: { type: 'softstyle_tee', price: 2700, name: 'Gildan 64000 Softstyle T-Shirt' },
            157: { type: 'kids_tee', price: 2200, name: 'Gildan 5000B Kids Heavy Cotton Tee' },
            // 長袖
            80: { type: 'longsleeve', price: 3200, name: 'Gildan 2400 Ultra Cotton Long Sleeve Tee' },
            // スウェット・フーディ
            49: { type: 'sweatshirt', price: 4000, name: 'Gildan 18000 Sweatshirt' },
            77: { type: 'hoodie', price: 4500, name: 'Gildan 18500 Hoodie' }
        };

        console.log('Starting bulk price update for shop:', shopId);

        // 1. 全商品を取得
        const productsResponse = await fetch(
            `https://api.printify.com/v1/shops/${shopId}/products.json`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!productsResponse.ok) {
            const errorText = await productsResponse.text();
            throw new ExternalAPIError('Printify', `Failed to fetch products (${productsResponse.status})`, errorText);
        }

        const productsData = await productsResponse.json();
        const products = productsData.data || [];

        console.log(`Found ${products.length} products in shop`);

        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const updateDetails = [];

        // 2. 各商品の価格を更新
        for (const product of products) {
            try {
                console.log(`Processing product ${product.id}: ${product.title}`);

                // 商品の詳細情報を取得（blueprint_idを確認するため）
                const productDetailResponse = await fetch(
                    `https://api.printify.com/v1/shops/${shopId}/products/${product.id}.json`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!productDetailResponse.ok) {
                    console.error(`Failed to fetch product ${product.id} details`);
                    errorCount++;
                    continue;
                }

                const productDetail = await productDetailResponse.json();
                const blueprintId = productDetail.blueprint_id;

                // Blueprint IDから価格を判定
                const priceConfig = blueprintToPriceMap[blueprintId];

                if (!priceConfig) {
                    console.log(`Unknown blueprint ID ${blueprintId} for product ${product.id}, skipping`);
                    skippedCount++;
                    updateDetails.push({
                        productId: product.id,
                        title: product.title,
                        status: 'skipped',
                        reason: `Unknown blueprint ID: ${blueprintId}`
                    });
                    continue;
                }

                const { type, price, name } = priceConfig;

                // 現在の価格を確認
                const currentVariants = productDetail.variants || [];
                const needsUpdate = currentVariants.some(v => v.price !== price);

                if (!needsUpdate) {
                    console.log(`Product ${product.id} already has correct price (¥${price}), skipping`);
                    skippedCount++;
                    updateDetails.push({
                        productId: product.id,
                        title: product.title,
                        productType: name,
                        status: 'skipped',
                        reason: 'Already correct price'
                    });
                    continue;
                }

                // 全variantの価格を更新
                const updatedVariants = currentVariants.map(variant => ({
                    id: variant.id,
                    price: price,
                    is_enabled: variant.is_enabled
                }));

                // 商品を更新
                const updateResponse = await fetch(
                    `https://api.printify.com/v1/shops/${shopId}/products/${product.id}.json`,
                    {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            variants: updatedVariants
                        })
                    }
                );

                if (!updateResponse.ok) {
                    const errorText = await updateResponse.text();
                    console.error(`Failed to update product ${product.id}: ${errorText}`);
                    errorCount++;
                    updateDetails.push({
                        productId: product.id,
                        title: product.title,
                        productType: name,
                        status: 'error',
                        reason: `Update failed: ${errorText.substring(0, 100)}`
                    });
                    continue;
                }

                console.log(`✅ Updated product ${product.id} (${name}) to ¥${price}`);
                updatedCount++;
                updateDetails.push({
                    productId: product.id,
                    title: product.title,
                    productType: name,
                    status: 'updated',
                    newPrice: `¥${price}`
                });

                // レート制限対策：各更新の間に500ms待機
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`Error processing product ${product.id}:`, error);
                errorCount++;
                updateDetails.push({
                    productId: product.id,
                    title: product.title,
                    status: 'error',
                    reason: error.message
                });
            }
        }

        console.log(`Price update completed. Updated: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);

        res.status(200).json({
            success: true,
            updated: updatedCount,
            skipped: skippedCount,
            errors: errorCount,
            total: products.length,
            details: updateDetails,
            priceConfig: {
                'Tシャツ (Gildan 5000)': '¥2,500',
                '軽量Tシャツ (Gildan 980)': '¥2,700',
                'ウルトラコットンTシャツ (Gildan 2000)': '¥2,800',
                'ソフトスタイルTシャツ (Gildan 64000)': '¥2,700',
                'キッズTシャツ (Gildan 5000B)': '¥2,200',
                '長袖Tシャツ (Gildan 2400)': '¥3,200',
                'スウェット (Gildan 18000)': '¥4,000',
                'フーディ (Gildan 18500)': '¥4,500'
            }
        });
}

// Apply rate limiting: max 2 requests per minute (this is a heavy operation)
export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 2, windowMs: 60000 }
);
