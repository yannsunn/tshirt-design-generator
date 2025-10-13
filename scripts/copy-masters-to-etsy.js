// Copy 7 missing master products from Storefront (24565480) to Etsy (24566474)
// Etsy already has tshirt master, so we copy the remaining 7

const https = require('https');

const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY;
const SOURCE_SHOP = '24565480'; // Storefront
const TARGET_SHOP = '24566474'; // Etsy

// Master product IDs from Storefront (excluding tshirt which already exists on Etsy)
const mastersToCopy = {
    lightweight_tee: '68eb8052aa2890fa97097970',    // Blueprint 26: Gildan 980
    ultra_cotton_tee: '68eb8054a0786662a60357da',   // Blueprint 36: Gildan 2000
    softstyle_tee: '68eb8059aa2890fa97097974',      // Blueprint 145: Gildan 64000
    kids_tee: '68eb805da0c8ed2f2c0f0314',           // Blueprint 157: Gildan 5000B
    longsleeve: '68eb8060ff3c0ac2d50ebd3f',         // Blueprint 80: Gildan 2400
    sweatshirt: '68eb8063a0786662a60357dd',         // Blueprint 49: Gildan 18000
    hoodie: '68eb8068cb19b441780df848'              // Blueprint 77: Gildan 18500
};

async function httpRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function getMasterProduct(productId) {
    const options = {
        hostname: 'api.printify.com',
        path: `/v1/shops/${SOURCE_SHOP}/products/${productId}.json`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${PRINTIFY_API_KEY}`,
            'Content-Type': 'application/json'
        }
    };
    return await httpRequest(options);
}

async function createProduct(productData) {
    const options = {
        hostname: 'api.printify.com',
        path: `/v1/shops/${TARGET_SHOP}/products.json`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${PRINTIFY_API_KEY}`,
            'Content-Type': 'application/json'
        }
    };
    return await httpRequest(options, productData);
}

async function copyMasterToEtsy(productType, masterId) {
    console.log(`\n📦 ${productType}: コピー中...`);

    try {
        // Get master product
        const master = await getMasterProduct(masterId);
        console.log(`   ✅ マスター取得成功: ${master.title}`);

        // Create new product on Etsy with same structure
        const newProduct = {
            title: master.title,
            description: master.description,
            blueprint_id: master.blueprint_id,
            print_provider_id: master.print_provider_id,
            variants: master.variants.map(v => ({
                id: v.id,
                price: v.price,
                is_enabled: v.is_enabled
            })),
            print_areas: master.print_areas
        };

        const result = await createProduct(newProduct);
        console.log(`   ✅ Etsy商品作成成功: ${result.id}`);

        return { productType, oldId: masterId, newId: result.id };
    } catch (error) {
        console.error(`   ❌ エラー:`, error.message);
        return { productType, oldId: masterId, newId: null, error: error.message };
    }
}

async function main() {
    console.log('🚀 Etsyショップへのマスター商品コピー開始\n');
    console.log(`From: Storefront (${SOURCE_SHOP})`);
    console.log(`To: Etsy (${TARGET_SHOP})\n`);

    const results = [];

    for (const [productType, masterId] of Object.entries(mastersToCopy)) {
        const result = await copyMasterToEtsy(productType, masterId);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit
    }

    console.log('\n\n=== 結果 ===\n');
    console.log('Etsyショップの新しいマスター商品ID:');
    console.log('```');
    results.forEach(r => {
        if (r.newId) {
            console.log(`${r.productType}: '${r.newId}',`);
        } else {
            console.log(`${r.productType}: FAILED - ${r.error}`);
        }
    });
    console.log('```');
}

main().catch(console.error);
