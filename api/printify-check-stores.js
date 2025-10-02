// Printify接続済みストアと販売チャネルを確認するAPI
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv, ExternalAPIError } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);

    const apiKey = process.env.PRINTIFY_API_KEY;

    try {
        console.log('📋 Printify接続ストアを確認中...');

        // 1. 全ショップを取得
        const shopsResponse = await fetch('https://api.printify.com/v1/shops.json', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!shopsResponse.ok) {
            const errorText = await shopsResponse.text();
            throw new ExternalAPIError('Printify', `Failed to fetch shops (${shopsResponse.status})`, errorText);
        }

        const shops = await shopsResponse.json();
        console.log(`✅ ${shops.length}個のショップが見つかりました`);

        // 2. 各ショップの詳細を取得
        const shopDetails = [];

        for (const shop of shops) {
            try {
                const shopDetailResponse = await fetch(
                    `https://api.printify.com/v1/shops/${shop.id}.json`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!shopDetailResponse.ok) {
                    console.error(`Failed to fetch shop ${shop.id} details`);
                    continue;
                }

                const detail = await shopDetailResponse.json();

                // 販売チャネルの種類を判定
                let salesChannel = 'Unknown';
                let channelStatus = 'disconnected';

                if (detail.sales_channel) {
                    salesChannel = detail.sales_channel;
                }

                // 接続状態を確認（shop.sales_channelが存在すれば接続済み）
                if (detail.sales_channel && detail.sales_channel !== 'disconnected') {
                    channelStatus = 'connected';
                }

                shopDetails.push({
                    shopId: shop.id,
                    shopTitle: shop.title || 'Untitled Shop',
                    salesChannel: salesChannel,
                    status: channelStatus,
                    createdAt: detail.created_at || null
                });

                console.log(`  ✅ ${shop.title}: ${salesChannel} (${channelStatus})`);

                // レート制限対策
                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (error) {
                console.error(`Error fetching shop ${shop.id}:`, error.message);
            }
        }

        // 3. 販売チャネル別にグループ化
        const channelGroups = {};
        shopDetails.forEach(shop => {
            const channel = shop.salesChannel || 'Unknown';
            if (!channelGroups[channel]) {
                channelGroups[channel] = [];
            }
            channelGroups[channel].push(shop);
        });

        // 4. サマリー作成
        const summary = {
            totalShops: shops.length,
            connectedShops: shopDetails.filter(s => s.status === 'connected').length,
            disconnectedShops: shopDetails.filter(s => s.status === 'disconnected').length,
            channelBreakdown: Object.keys(channelGroups).map(channel => ({
                channel: channel,
                count: channelGroups[channel].length,
                shops: channelGroups[channel].map(s => s.shopTitle)
            }))
        };

        // 5. Etsy/eBay連携状態を明示的にチェック
        const etsyConnected = shopDetails.some(s =>
            s.salesChannel && s.salesChannel.toLowerCase().includes('etsy') && s.status === 'connected'
        );
        const ebayConnected = shopDetails.some(s =>
            s.salesChannel && s.salesChannel.toLowerCase().includes('ebay') && s.status === 'connected'
        );

        res.status(200).json({
            success: true,
            summary: summary,
            shops: shopDetails,
            integrations: {
                etsy: {
                    connected: etsyConnected,
                    message: etsyConnected
                        ? '✅ Etsyと連携済みです'
                        : '⚠️ Etsyとの連携が見つかりません。Printifyダッシュボードで連携してください。'
                },
                ebay: {
                    connected: ebayConnected,
                    message: ebayConnected
                        ? '✅ eBayと連携済みです'
                        : '⚠️ eBayとの連携が見つかりません。Printifyダッシュボードで連携してください（eBay USのみ対応）。'
                }
            },
            recommendations: [
                etsyConnected ? null : '1. Etsyアカウントを作成し、Printifyダッシュボードで連携してください',
                ebayConnected ? null : '2. eBay USアカウントを作成し、Printifyダッシュボードで連携してください',
                '3. 連携後、このAPIを再実行して確認してください'
            ].filter(Boolean)
        });

    } catch (error) {
        console.error('❌ ストア確認エラー:', error);
        throw error;
    }
}

// レート制限: 10リクエスト/分
export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 10, windowMs: 60000 }
);
