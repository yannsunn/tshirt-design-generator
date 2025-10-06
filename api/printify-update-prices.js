// Printifyサイズ別価格一括更新（2XL/3XL対応、38%利益率達成）
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateRequired, validateEnv, ExternalAPIError } from '../lib/errorHandler.js';
import { blueprintCosts, calculateVariantPrice } from '../lib/blueprintCosts.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);
    validateRequired(req.body, ['shopId']);

    const { shopId, targetMargin = 38, dryRun = false, productIds = null } = req.body;
    const apiKey = process.env.PRINTIFY_API_KEY;

    try {
        console.log(`📊 サイズ別価格一括更新開始: 目標利益率${targetMargin}%`);
        if (dryRun) {
            console.log('⚠️ DRY RUNモード: 実際の更新は行いません');
        }
        if (productIds) {
            console.log(`🎯 特定商品のみ更新: ${productIds.length}商品`);
        }

        let products = [];

        // 特定商品IDが指定されている場合は、それらのみ処理
        if (productIds && Array.isArray(productIds) && productIds.length > 0) {
            // productIds から商品情報を直接作成（詳細取得は後で行う）
            products = productIds.map(id => ({ id }));
            console.log(`📋 ${products.length}商品を対象に設定`);
        } else {
            // 全商品を取得（ページネーション対応）
            let allProducts = [];
            let currentPage = 1;
            let hasMorePages = true;

            while (hasMorePages) {
                const productsResponse = await fetch(
                    `https://api.printify.com/v1/shops/${shopId}/products.json?limit=50&page=${currentPage}`,
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
                const pageProducts = productsData.data || [];
                allProducts = allProducts.concat(pageProducts);

                console.log(`📄 ページ${currentPage}: ${pageProducts.length}件取得`);

                hasMorePages = pageProducts.length === 50;
                currentPage++;

                if (hasMorePages) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }

            products = allProducts;
            console.log(`📋 ${products.length}商品を取得`);
        }

        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const updateDetails = [];

        // 各商品を処理
        for (const product of products) {
            try {
                console.log(`\n処理中: ${product.title} (ID: ${product.id})`);

                // 商品詳細を取得
                const detailResponse = await fetch(
                    `https://api.printify.com/v1/shops/${shopId}/products/${product.id}.json`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!detailResponse.ok) {
                    console.error(`Failed to fetch product ${product.id}`);
                    errorCount++;
                    continue;
                }

                const detail = await detailResponse.json();
                const blueprintId = detail.blueprint_id;
                const variants = detail.variants || [];

                const costInfo = blueprintCosts[blueprintId];
                if (!costInfo) {
                    console.log(`Unknown blueprint ${blueprintId}, skipping`);
                    skippedCount++;
                    updateDetails.push({
                        productId: product.id,
                        title: product.title,
                        status: 'skipped',
                        reason: `Unknown blueprint: ${blueprintId}`
                    });
                    continue;
                }

                // 各variantに最適価格を設定（共通モジュールを使用）
                const updatedVariants = variants.map(variant => {
                    const optimalPrice = calculateVariantPrice(blueprintId, variant.title || '', targetMargin);

                    return {
                        id: variant.id,
                        price: optimalPrice,
                        is_enabled: variant.is_enabled
                    };
                });

                // 価格が変更されたか確認
                const hasChanges = updatedVariants.some((updatedVariant, index) => {
                    return updatedVariant.price !== variants[index].price;
                });

                if (!hasChanges) {
                    console.log(`✓ 価格は既に最適です`);
                    skippedCount++;
                    updateDetails.push({
                        productId: product.id,
                        title: product.title,
                        productType: costInfo.name,
                        status: 'skipped',
                        reason: 'Already optimal pricing'
                    });
                    continue;
                }

                if (dryRun) {
                    console.log(`[DRY RUN] 更新予定: ${costInfo.name}`);
                    updatedCount++;
                    updateDetails.push({
                        productId: product.id,
                        title: product.title,
                        productType: costInfo.name,
                        status: 'dry-run',
                        message: '更新が必要（DRY RUNのため実行なし）',
                        variants: updatedVariants.map((v, i) => ({
                            title: variants[i].title,
                            currentPrice: variants[i].price,
                            newPrice: v.price
                        }))
                    });
                    continue;
                }

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
                        productType: costInfo.name,
                        status: 'error',
                        reason: `Update failed: ${errorText.substring(0, 100)}`
                    });
                    continue;
                }

                console.log(`✅ 更新成功: ${costInfo.name}`);
                updatedCount++;
                updateDetails.push({
                    productId: product.id,
                    title: product.title,
                    productType: costInfo.name,
                    status: 'updated',
                    message: `サイズ別価格を最適化（${targetMargin}%利益率達成）`
                });

                // レート制限対策
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

        console.log(`\n📊 処理完了: 更新${updatedCount}件、スキップ${skippedCount}件、エラー${errorCount}件`);

        res.status(200).json({
            success: true,
            dryRun: dryRun,
            targetMargin: targetMargin,
            updated: updatedCount,
            skipped: skippedCount,
            errors: errorCount,
            total: products.length,
            details: updateDetails,
            priceConfig: {
                'Tシャツ (Gildan 5000)': {
                    'S-XL': '$18.99 (原価$11.67, 38.5%利益)',
                    '2XL': '$25.99 (原価$15.44, 40.6%利益)',
                    '3XL': '$26.99 (原価$16.36, 39.4%利益)'
                },
                'スウェット (Gildan 18000)': {
                    'S-XL': '$36.99 (原価$22.30, 39.7%利益)',
                    '2XL': '$44.99 (原価$26.80, 40.4%利益)',
                    '3XL': '$51.99 (原価$31.30, 39.8%利益)'
                },
                'フーディ (Gildan 18500)': {
                    'S-XL': '$44.99 (原価$27.00, 40.0%利益)',
                    '2XL': '$52.99 (原価$31.50, 40.5%利益)',
                    '3XL': '$59.99 (原価$36.00, 40.0%利益)'
                }
            },
            note: dryRun ? 'DRY RUNモードです。実際の更新を行うにはdryRun=falseで再実行してください。' : 'サイズ別価格を$X.99形式で最適化しました（利益率38〜41%）。'
        });

    } catch (error) {
        console.error('❌ 価格更新エラー:', error);
        throw error;
    }
}

// レート制限: 2リクエスト/分（重い処理）
export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 2, windowMs: 60000 }
);
