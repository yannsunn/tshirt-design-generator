// 在庫管理：Printifyの在庫を全ショップに同期
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);

    const apiKey = process.env.PRINTIFY_API_KEY;

    // 全ショップID
    const shops = [
        { id: '24565480', name: 'AwakeInc (Storefront)' },
        { id: '24566474', name: 'My Etsy Store' },
        { id: '24566516', name: 'Awake (eBay)' }
    ];

    try {
        console.log('📦 在庫同期開始');

        const results = {
            shops: []
        };

        // 基準となるショップ（Storefront）の在庫を取得
        const baseShopId = shops[0].id;

        console.log(`📋 基準ショップ（${shops[0].name}）から在庫情報を取得中...`);

        const baseProductsResponse = await fetch(
            `https://api.printify.com/v1/shops/${baseShopId}/products.json?limit=100&page=1`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!baseProductsResponse.ok) {
            throw new Error('Failed to fetch base products');
        }

        const baseProductsData = await baseProductsResponse.json();
        const baseProducts = baseProductsData.data || [];

        // 商品IDと在庫状態のマッピングを作成
        const inventoryMap = new Map();

        for (const product of baseProducts.slice(0, 50)) { // 最初の50商品のみ処理（テスト）
            try {
                const detailResponse = await fetch(
                    `https://api.printify.com/v1/shops/${baseShopId}/products/${product.id}.json`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!detailResponse.ok) continue;

                const detail = await detailResponse.json();

                // バリアントの在庫状態を記録
                const variantInventory = detail.variants.map(v => ({
                    id: v.id,
                    is_enabled: v.is_enabled,
                    sku: v.sku
                }));

                inventoryMap.set(product.id, {
                    title: product.title,
                    variants: variantInventory
                });

                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (error) {
                console.error(`Error fetching product ${product.id}:`, error.message);
            }
        }

        console.log(`📦 ${inventoryMap.size}商品の在庫情報を取得しました`);

        // 他のショップに在庫を同期
        for (const shop of shops.slice(1)) { // Storefront以外
            console.log(`\n🔄 ${shop.name}に在庫を同期中...`);

            let syncedCount = 0;
            let errorCount = 0;

            for (const [productId, inventory] of inventoryMap) {
                try {
                    // 同じ商品IDで他のショップの商品を取得
                    const shopDetailResponse = await fetch(
                        `https://api.printify.com/v1/shops/${shop.id}/products/${productId}.json`,
                        {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    if (!shopDetailResponse.ok) {
                        // 商品が存在しない場合はスキップ
                        continue;
                    }

                    const shopDetail = await shopDetailResponse.json();

                    // バリアントの在庫状態を基準ショップに合わせる
                    const updatedVariants = shopDetail.variants.map(variant => {
                        // SKUまたはIDで対応するバリアントを探す
                        const baseVariant = inventory.variants.find(
                            v => v.sku === variant.sku || v.id === variant.id
                        );

                        return {
                            id: variant.id,
                            is_enabled: baseVariant ? baseVariant.is_enabled : variant.is_enabled,
                            price: variant.price // 価格はそのまま保持
                        };
                    });

                    // 変更があるかチェック
                    const hasChanges = updatedVariants.some((updatedVariant, index) => {
                        return updatedVariant.is_enabled !== shopDetail.variants[index].is_enabled;
                    });

                    if (!hasChanges) {
                        continue;
                    }

                    // 商品を更新
                    const updateResponse = await fetch(
                        `https://api.printify.com/v1/shops/${shop.id}/products/${productId}.json`,
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
                        errorCount++;
                        continue;
                    }

                    console.log(`✅ 同期: ${inventory.title.substring(0, 40)}`);
                    syncedCount++;

                    await new Promise(resolve => setTimeout(resolve, 500));

                } catch (error) {
                    console.error(`Error syncing product ${productId}:`, error.message);
                    errorCount++;
                }
            }

            results.shops.push({
                shopId: shop.id,
                shopName: shop.name,
                synced: syncedCount,
                errors: errorCount
            });

            console.log(`📊 ${shop.name}: 同期${syncedCount}件、エラー${errorCount}件`);
        }

        const totalSynced = results.shops.reduce((sum, s) => sum + s.synced, 0);
        const totalErrors = results.shops.reduce((sum, s) => sum + s.errors, 0);

        res.status(200).json({
            success: true,
            totalSynced,
            totalErrors,
            baseProducts: inventoryMap.size,
            results: results.shops,
            message: `✅ 在庫同期完了: ${totalSynced}商品を同期しました`
        });

    } catch (error) {
        console.error('❌ 在庫同期エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 5, windowMs: 60000 }
);
