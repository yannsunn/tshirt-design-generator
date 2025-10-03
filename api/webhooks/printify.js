// Printify Webhook受信エンドポイント
// 価格変更時に自動で価格同期を実行

import { validateEnv } from '../../lib/errorHandler.js';

export default async function handler(req, res) {
    // GETリクエスト: Webhookステータス確認用
    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'active',
            endpoint: '/api/webhooks/printify',
            method: 'POST only',
            events: ['product:updated'],
            description: 'Printify Webhook endpoint for automatic price synchronization',
            message: '✅ Webhook is ready to receive POST requests from Printify'
        });
    }

    // POST以外のリクエスト
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. This endpoint only accepts POST requests.' });
    }

    try {
        validateEnv(['PRINTIFY_API_KEY']);

        const webhookData = req.body;

        console.log('📨 Printify Webhook受信:', JSON.stringify(webhookData, null, 2));

        // Webhookイベントタイプを確認
        const eventType = webhookData.type || webhookData.event;

        if (!eventType) {
            console.warn('⚠️ Webhookイベントタイプが不明です');
            return res.status(200).json({ received: true, message: 'Event type unknown' });
        }

        // 価格変更イベント（product:updated）の処理
        if (eventType === 'product:updated' || eventType === 'product_updated') {
            await handleProductUpdated(webhookData);
        }
        // 商品作成イベント
        else if (eventType === 'product:created' || eventType === 'product_created') {
            console.log('📦 新規商品作成イベント:', webhookData.data?.id);
        }
        // 商品削除イベント
        else if (eventType === 'product:deleted' || eventType === 'product_deleted') {
            console.log('🗑️ 商品削除イベント:', webhookData.data?.id);
        }
        // その他のイベント
        else {
            console.log('📬 その他のイベント:', eventType);
        }

        // Webhookを正常に受信したことを返す（重要）
        res.status(200).json({
            received: true,
            event: eventType,
            message: 'Webhook processed successfully'
        });

    } catch (error) {
        console.error('❌ Webhook処理エラー:', error);
        // Webhookではエラーでも200を返す（Printifyの再送を避けるため）
        res.status(200).json({
            received: true,
            error: error.message
        });
    }
}

/**
 * 商品更新イベント処理（価格変更を自動同期）
 */
async function handleProductUpdated(webhookData) {
    try {
        const productId = webhookData.data?.id || webhookData.resource?.id;
        const shopId = webhookData.shop_id || webhookData.data?.shop_id;

        if (!productId || !shopId) {
            console.warn('⚠️ 商品IDまたはショップIDが見つかりません');
            return;
        }

        console.log(`🔄 商品更新検知: Product ${productId} in Shop ${shopId}`);

        // Storefrontショップの場合のみ自動同期を実行
        const storefrontShopId = '24565480';

        if (shopId === storefrontShopId) {
            console.log('✅ Storefrontの商品が更新されました。価格同期を開始します...');

            // 価格同期APIを内部的に呼び出し
            await syncPricesForProduct(productId);
        } else {
            console.log('ℹ️ Storefront以外のショップの更新です。同期は不要です。');
        }

    } catch (error) {
        console.error('❌ 商品更新処理エラー:', error);
    }
}

/**
 * 特定商品の価格をEtsy/eBayに同期
 */
async function syncPricesForProduct(productId) {
    try {
        const apiKey = process.env.PRINTIFY_API_KEY;
        const storefrontShopId = '24565480';
        const etsyShopId = '24566474';
        const ebayShopId = '24566516';

        // Storefrontの商品詳細を取得
        const storefrontDetailResponse = await fetch(
            `https://api.printify.com/v1/shops/${storefrontShopId}/products/${productId}.json`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!storefrontDetailResponse.ok) {
            console.error('❌ Storefront商品の取得に失敗しました');
            return;
        }

        const storefrontDetail = await storefrontDetailResponse.json();
        const storefrontVariants = storefrontDetail.variants;

        console.log(`📋 Storefront価格を取得: ${storefrontVariants.length}バリアント`);

        // Etsy/eBayに同じ価格を適用
        for (const targetShopId of [etsyShopId, ebayShopId]) {
            try {
                const targetDetailResponse = await fetch(
                    `https://api.printify.com/v1/shops/${targetShopId}/products/${productId}.json`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!targetDetailResponse.ok) {
                    console.log(`ℹ️ Shop ${targetShopId}に商品が存在しません（スキップ）`);
                    continue;
                }

                const targetDetail = await targetDetailResponse.json();

                // バリアント価格を同期
                const updatedVariants = targetDetail.variants.map((variant, index) => {
                    const storefrontVariant = storefrontVariants[index];
                    return {
                        id: variant.id,
                        price: storefrontVariant ? storefrontVariant.price : variant.price,
                        is_enabled: variant.is_enabled
                    };
                });

                // 価格変更があるかチェック
                const hasChanges = updatedVariants.some((updatedVariant, index) => {
                    return updatedVariant.price !== targetDetail.variants[index].price;
                });

                if (!hasChanges) {
                    console.log(`✓ Shop ${targetShopId}: 価格変更なし`);
                    continue;
                }

                // 更新実行
                const updateResponse = await fetch(
                    `https://api.printify.com/v1/shops/${targetShopId}/products/${productId}.json`,
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

                if (updateResponse.ok) {
                    console.log(`✅ Shop ${targetShopId}: 価格同期成功`);
                } else {
                    console.error(`❌ Shop ${targetShopId}: 価格同期失敗`);
                }

                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`❌ Shop ${targetShopId}の同期エラー:`, error.message);
            }
        }

        console.log('🎉 価格自動同期完了');

    } catch (error) {
        console.error('❌ 価格同期エラー:', error);
    }
}
