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
            throw new Error('Failed to fetch existing webhooks');
        }

        const existingWebhooks = await existingWebhooksResponse.json();
        console.log('📋 既存のWebhook:', existingWebhooks);

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
        const createWebhookResponse = await fetch(
            `https://api.printify.com/v1/shops/${storefrontShopId}/webhooks.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    topic: 'product:updated',
                    url: webhookUrl
                })
            }
        );

        if (!createWebhookResponse.ok) {
            const errorData = await createWebhookResponse.json().catch(() => ({}));
            console.error('❌ Webhook登録失敗:', errorData);
            throw new Error(errorData.message || 'Failed to create webhook');
        }

        const newWebhook = await createWebhookResponse.json();
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
