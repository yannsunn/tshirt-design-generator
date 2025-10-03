// Printify Webhook登録API
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);

    const apiKey = process.env.PRINTIFY_API_KEY;
    const storefrontShopId = '24565480';

    // Webhook URL (your Vercel deployment)
    const webhookUrl = 'https://design-generator-puce.vercel.app/api/webhooks/printify';

    try {
        console.log('🔗 Printify Webhook登録開始');

        // 既存のWebhookを確認
        const existingWebhooksResponse = await fetch(
            `https://api.printify.com/v1/shops/${storefrontShopId}/webhooks.json`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!existingWebhooksResponse.ok) {
            const errorText = await existingWebhooksResponse.text();
            console.error('❌ Webhook取得エラー:', existingWebhooksResponse.status, errorText);
            throw new Error(`Failed to fetch existing webhooks: ${existingWebhooksResponse.status}`);
        }

        const existingWebhooksData = await existingWebhooksResponse.json();
        console.log('📋 既存のWebhook:', existingWebhooksData);

        // レスポンスが配列か、dataプロパティに配列があるか確認
        const existingWebhooks = Array.isArray(existingWebhooksData)
            ? existingWebhooksData
            : (existingWebhooksData.data || []);

        // 同じURLのWebhookが既に存在するかチェック
        const existingWebhook = existingWebhooks.find(w => w.url === webhookUrl);

        if (existingWebhook) {
            console.log('✅ Webhook既に登録済み:', existingWebhook.id);
            return res.status(200).json({
                success: true,
                message: 'Webhook既に登録されています',
                webhook: existingWebhook
            });
        }

        // 新しいWebhookを登録
        // Printify APIのWebhookフォーマットをいくつか試す
        const webhookPayload = {
            topic: 'product:updated',
            url: webhookUrl
        };

        console.log('🔗 Webhook登録リクエスト:', webhookPayload);

        const createWebhookResponse = await fetch(
            `https://api.printify.com/v1/shops/${storefrontShopId}/webhooks.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(webhookPayload)
            }
        );

        const responseText = await createWebhookResponse.text();
        console.log('📡 Webhook作成レスポンス:', createWebhookResponse.status, responseText);

        if (!createWebhookResponse.ok) {
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch {
                errorData = { message: responseText };
            }
            console.error('❌ Webhook登録失敗:', createWebhookResponse.status, errorData);
            throw new Error(errorData.message || `Failed to create webhook: ${createWebhookResponse.status} - ${responseText}`);
        }

        const newWebhook = JSON.parse(responseText);
        console.log('✅ Webhook登録成功:', newWebhook);

        res.status(200).json({
            success: true,
            message: '✅ Webhook登録完了！Storefrontの価格変更時に自動同期されます',
            webhook: newWebhook,
            events: ['product:updated'],
            targetUrl: webhookUrl
        });

    } catch (error) {
        console.error('❌ Webhook登録エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 5, windowMs: 60000 }
);
