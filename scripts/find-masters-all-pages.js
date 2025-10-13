// Scan all pages to find master products in Etsy shop
require('dotenv').config();

const https = require('https');

const API_KEY = process.env.PRINTIFY_API_KEY;
const ETSY_SHOP = '24566474';

async function getProducts(page = 1) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.printify.com',
            path: `/v1/shops/${ETSY_SHOP}/products.json?limit=50&page=${page}`,
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
    console.log('🔍 Etsyショップの全ページをスキャン中...\n');

    const allMasters = [];
    let page = 1;
    let hasMore = true;

    try {
        while (hasMore) {
            console.log(`ページ ${page} を取得中...`);
            const data = await getProducts(page);

            const products = data.data || [];
            const masters = products.filter(p => p.title.includes('[MASTER]'));

            if (masters.length > 0) {
                console.log(`  ✅ ${masters.length}件のマスター商品を発見！`);
                allMasters.push(...masters);
            }

            // Check if there are more pages
            hasMore = data.current_page < data.last_page;

            if (hasMore) {
                page++;
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Safety limit: scan first 10 pages only
            if (page > 10) {
                console.log('\n⚠️  10ページ以上あります。最初の10ページのみスキャンしました。');
                break;
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log(`\n✅ スキャン完了: ${page}ページ中 ${allMasters.length}件のマスター商品を発見\n`);

        if (allMasters.length > 0) {
            console.log('📋 マスター商品一覧:\n');

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

            allMasters.forEach(p => {
                const blueprintName = blueprintNames[p.blueprint_id] || `Blueprint ${p.blueprint_id}`;
                console.log(`✅ ${p.title}`);
                console.log(`   ID: ${p.id}`);
                console.log(`   Blueprint: ${blueprintName} (${p.blueprint_id})`);
                console.log(`   作成日: ${p.created_at}\n`);
            });

            console.log('📋 コードマッピング:');
            console.log(`'24566474': {  // Etsy - My Etsy Store`);

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

            allMasters.sort((a, b) => a.blueprint_id - b.blueprint_id).forEach(p => {
                const type = typeMap[p.blueprint_id];
                if (type) {
                    console.log(`    ${type}: '${p.id}',  // ${blueprintNames[p.blueprint_id]}`);
                }
            });
            console.log('},');

        } else {
            console.log('❌ マスター商品が見つかりませんでした');
            console.log('\nPrintify UIで表示されているマスター商品は、別のショップ（eBay/Awake など）にある可能性があります。');
        }

    } catch (error) {
        console.error('❌ エラー:', error.message);
    }
}

main().catch(console.error);
