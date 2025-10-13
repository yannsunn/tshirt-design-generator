// Compare master products between shops
require('dotenv').config();

const https = require('https');

const API_KEY = process.env.PRINTIFY_API_KEY;
const ETSY_SHOP = '24566474';
const EBAY_SHOP = '24566516';

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
    console.log('🔍 マスター商品比較\n');

    // Get products from both shops
    const [etsyData, ebayData] = await Promise.all([
        getProducts(ETSY_SHOP),
        getProducts(EBAY_SHOP)
    ]);

    const etsyMasters = etsyData.data.filter(p => p.title.includes('[MASTER]'));
    const ebayMasters = ebayData.data.filter(p => p.title.includes('[MASTER]'));

    console.log(`📦 Etsy (${ETSY_SHOP}): ${etsyMasters.length}件のマスター商品`);
    etsyMasters.forEach(p => {
        console.log(`   - ${p.title} (ID: ${p.id}, Blueprint: ${p.blueprint_id})`);
    });

    console.log(`\n📦 eBay (${EBAY_SHOP}): ${ebayMasters.length}件のマスター商品`);
    ebayMasters.forEach(p => {
        console.log(`   - ${p.title} (ID: ${p.id}, Blueprint: ${p.blueprint_id})`);
    });

    // Compare blueprints
    const etsyBlueprints = new Set(etsyMasters.map(p => p.blueprint_id));
    const ebayBlueprints = new Set(ebayMasters.map(p => p.blueprint_id));

    console.log('\n📊 比較結果:');
    console.log(`   Etsyにあり: ${etsyBlueprints.size}種類`);
    console.log(`   eBayにあり: ${ebayBlueprints.size}種類`);

    // Find missing in Etsy
    const missingInEtsy = [...ebayBlueprints].filter(b => !etsyBlueprints.has(b));
    if (missingInEtsy.length > 0) {
        console.log(`\n❌ Etsyに不足している Blueprint: ${missingInEtsy.length}件`);
        missingInEtsy.forEach(blueprintId => {
            const ebayProduct = ebayMasters.find(p => p.blueprint_id === blueprintId);
            console.log(`   - Blueprint ${blueprintId}: ${ebayProduct.title}`);
        });
    } else {
        console.log('\n✅ EtsyにはeBayと同じマスター商品があります');
    }

    // Generate mapping for code
    console.log('\n📋 Etsy Shop マッピング用コード:');
    console.log("'24566474': {  // Etsy");

    const blueprintTypeMap = {
        6: 'tshirt',
        26: 'lightweight_tee',
        36: 'ultra_cotton_tee',
        145: 'softstyle_tee',
        157: 'kids_tee',
        80: 'longsleeve',
        49: 'sweatshirt',
        77: 'hoodie'
    };

    etsyMasters.sort((a, b) => a.blueprint_id - b.blueprint_id).forEach(p => {
        const type = blueprintTypeMap[p.blueprint_id];
        if (type) {
            console.log(`    ${type}: '${p.id}',  // Blueprint ${p.blueprint_id}: ${p.title.replace('[MASTER] ', '')}`);
        }
    });
    console.log('}');
}

main().catch(console.error);
