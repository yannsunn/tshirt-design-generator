// Printify Webhook API動作テスト
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        validateEnv(['PRINTIFY_API_KEY']);

        const apiKey = process.env.PRINTIFY_API_KEY;
        const storefrontShopId = '24565480';

        console.log('🧪 Webhook APIテスト開始');

        // 既存のWebhookを取得
        const response = await fetch(
            `https://api.printify.com/v1/shops/${storefrontShopId}/webhooks.json`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const responseText = await response.text();
        console.log('📡 レスポンステキスト:', responseText);

        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ JSON解析エラー:', parseError);
            return res.status(200).json({
                success: false,
                apiStatus: response.status,
                apiStatusText: response.statusText,
                rawResponse: responseText,
                error: 'Failed to parse JSON response',
                message: 'Printify APIはWebhookエンドポイントをサポートしていない可能性があります'
            });
        }

        if (!response.ok) {
            return res.status(200).json({
                success: false,
                apiStatus: response.status,
                apiStatusText: response.statusText,
                apiError: responseData,
                message: 'Printify API error - Webhookエンドポイントが利用できません'
            });
        }

        // 成功した場合
        return res.status(200).json({
            success: true,
            apiStatus: response.status,
            message: '✅ Webhook API利用可能',
            existingWebhooks: responseData,
            webhooksCount: Array.isArray(responseData) ? responseData.length : (responseData.data?.length || 0)
        });

    } catch (error) {
        console.error('❌ テストエラー:', error);
        return res.status(200).json({
            success: false,
            error: error.message,
            errorStack: error.stack,
            message: 'テスト実行中にエラーが発生しました'
        });
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 10, windowMs: 60000 }
);
