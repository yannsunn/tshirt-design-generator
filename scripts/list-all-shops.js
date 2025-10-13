// List all shops to verify shop IDs and names
require('dotenv').config();

const https = require('https');

const API_KEY = process.env.PRINTIFY_API_KEY;

async function getShops() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.printify.com',
            path: '/v1/shops.json',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', reject).end();
    });
}

async function getProductCount(shopId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.printify.com',
            path: `/v1/shops/${shopId}/products.json?limit=1`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const result = JSON.parse(data);
                    resolve(result.current_page ? result.last_page * 50 : 0); // Rough estimate
                } else {
                    resolve(0);
                }
            });
        }).on('error', () => resolve(0)).end();
    });
}

async function main() {
    console.log('🏪 Printifyアカウントの全ショップ一覧\n');

    try {
        const shops = await getShops();

        if (!shops || shops.length === 0) {
            console.log('❌ ショップが見つかりません');
            return;
        }

        console.log(`総ショップ数: ${shops.length}件\n`);
        console.log('='.repeat(80) + '\n');

        for (const shop of shops) {
            console.log(`📦 ${shop.title}`);
            console.log(`   Shop ID: ${shop.id}`);
            console.log(`   Sales Channel: ${shop.sales_channel || 'N/A'}`);

            // Get product count
            const productCount = await getProductCount(shop.id);
            console.log(`   商品数: 約${productCount}件`);
            console.log('');

            // Wait to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('='.repeat(80));
        console.log('\n💡 Printify UIで見ているショップ名とIDを照合してください');
        console.log('   Etsy用のショップがどのIDか確認できます\n');

    } catch (error) {
        console.error('❌ エラー:', error.message);
    }
}

main().catch(console.error);
