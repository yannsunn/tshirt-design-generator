// List ALL products (not just masters) from Storefront shop
require('dotenv').config();

const https = require('https');

const API_KEY = process.env.PRINTIFY_API_KEY;
const SHOP_ID = '24565480'; // Storefront

async function getProducts(page = 1) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.printify.com',
            path: `/v1/shops/${SHOP_ID}/products.json?limit=50&page=${page}`,
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
    console.log('🔍 Storefrontショップの全商品一覧\n');

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

    // Get first page
    const data = await getProducts(1);
    const products = data.data || [];

    console.log(`総商品数: ${products.length}件\n`);

    // Group by blueprint
    const byBlueprint = {};
    products.forEach(p => {
        if (!byBlueprint[p.blueprint_id]) {
            byBlueprint[p.blueprint_id] = [];
        }
        byBlueprint[p.blueprint_id].push(p);
    });

    // Show products grouped by blueprint (focusing on the 8 master blueprints)
    const masterBlueprints = [6, 26, 36, 145, 157, 80, 49, 77];

    console.log('📦 マスター用Blueprint（8種類）の商品:\n');
    masterBlueprints.forEach(blueprintId => {
        const blueprintProducts = byBlueprint[blueprintId] || [];
        const blueprintName = blueprintNames[blueprintId] || `Blueprint ${blueprintId}`;

        console.log(`\n${'='.repeat(70)}`);
        console.log(`${blueprintName} (Blueprint ${blueprintId})`);
        console.log('='.repeat(70));

        if (blueprintProducts.length === 0) {
            console.log('❌ この種類の商品は存在しません');
        } else {
            console.log(`✅ ${blueprintProducts.length}件の商品:\n`);
            blueprintProducts.forEach((p, i) => {
                console.log(`${i + 1}. "${p.title}"`);
                console.log(`   ID: ${p.id}`);
                console.log(`   作成日: ${p.created_at}`);
                console.log(`   バリアント数: ${p.variants.length}個`);
                console.log('');
            });
        }
    });

    console.log('\n' + '='.repeat(70));
    console.log('📋 その他のBlueprint:');
    console.log('='.repeat(70) + '\n');

    Object.keys(byBlueprint)
        .filter(id => !masterBlueprints.includes(parseInt(id)))
        .forEach(blueprintId => {
            const products = byBlueprint[blueprintId];
            console.log(`Blueprint ${blueprintId}: ${products.length}件`);
        });
}

main().catch(console.error);
