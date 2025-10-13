// Find all master products across all Printify shops
require('dotenv').config();

const https = require('https');

const API_KEY = process.env.PRINTIFY_API_KEY;
const SHOPS = {
    'Storefront': '24565480',
    'Etsy': '24566474',
    'eBay/Samurai': '24566516',
    'eBay': '24566549'
};

async function getProducts(shopId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.printify.com',
            path: `/v1/shops/${shopId}/products.json?limit=50`,
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

async function main() {
    console.log('🔍 全ショップのマスター商品検索\n');

    const blueprintNames = {
        6: 'Gildan 5000 T-Shirt',
        26: 'Gildan 980 Lightweight',
        36: 'Gildan 2000 Ultra Cotton',
        145: 'Gildan 64000 Softstyle',
        157: 'Gildan 5000B Kids Tee',
        80: 'Gildan 2400 Long Sleeve',
        49: 'Gildan 18000 Sweatshirt',
        77: 'Gildan 18500 Hoodie'
    };

    for (const [shopName, shopId] of Object.entries(SHOPS)) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📦 ${shopName} (${shopId})`);
        console.log('='.repeat(60));

        try {
            const data = await getProducts(shopId);
            const allProducts = data.data || [];
            const masters = allProducts.filter(p => p.title.includes('[MASTER]'));

            console.log(`\n総商品数: ${allProducts.length}件`);
            console.log(`マスター商品数: ${masters.length}件\n`);

            if (masters.length > 0) {
                masters.forEach(p => {
                    const blueprintName = blueprintNames[p.blueprint_id] || `Blueprint ${p.blueprint_id}`;
                    console.log(`✅ ${p.title}`);
                    console.log(`   ID: ${p.id}`);
                    console.log(`   Blueprint: ${blueprintName} (${p.blueprint_id})`);
                    console.log(`   作成日: ${p.created_at}`);
                    console.log('');
                });

                // Generate code mapping
                console.log('📋 コードマッピング:');
                console.log(`'${shopId}': {  // ${shopName}`);

                const typeMap = {
                    6: 'tshirt',
                    26: 'lightweight_tee',
                    36: 'ultra_cotton_tee',
                    145: 'softstyle_tee',
                    157: 'kids_tee',
                    80: 'longsleeve',
                    49: 'sweatshirt',
                    77: 'hoodie'
                };

                masters.sort((a, b) => a.blueprint_id - b.blueprint_id).forEach(p => {
                    const type = typeMap[p.blueprint_id];
                    if (type) {
                        console.log(`    ${type}: '${p.id}',  // ${blueprintNames[p.blueprint_id]}`);
                    }
                });
                console.log('},');
            } else {
                console.log('❌ マスター商品が見つかりません');
            }

        } catch (error) {
            console.error(`❌ エラー: ${error.message}`);
        }

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 検索完了');
    console.log('='.repeat(60));
}

main().catch(console.error);
