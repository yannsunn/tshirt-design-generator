// SUZURI 商品確認スクリプト - Materials と Products の詳細表示
require('dotenv').config();

const https = require('https');

const SUZURI_ACCESS_TOKEN = process.env.SUZURI_ACCESS_TOKEN;

async function httpRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'suzuri.jp',
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SUZURI_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function main() {
    console.log('🔍 SUZURI 商品確認\n');

    try {
        // Materials取得
        console.log('📦 Materials（デザイン画像）:');
        const materials = await httpRequest('/api/v1/materials?limit=20');
        console.log(`   登録数: ${materials.materials.length}件\n`);

        if (materials.materials.length === 0) {
            console.log('   ⚠️  Materialが1件もありません');
            console.log('   → SUZURI APIで商品を作成していない可能性があります\n');
        } else {
            materials.materials.forEach((mat, index) => {
                console.log(`   ${index + 1}. "${mat.title}" (ID: ${mat.id})`);
                console.log(`      作成日: ${mat.createdAt || 'N/A'}`);
                console.log(`      公開状態: ${mat.published ? '公開' : '下書き'}`);
            });
        }

        // Products取得
        console.log('\n🛍️ Products（商品）:');
        const products = await httpRequest('/api/v1/products?limit=20');
        console.log(`   登録数: ${products.products.length}件\n`);

        if (products.products.length === 0) {
            console.log('   ⚠️  Productが1件もありません');
            console.log('   → Material作成時にProductsが同時作成されていない可能性があります\n');
        } else {
            // 商品タイプ別にカウント
            const typeCount = {};
            products.products.forEach((prod) => {
                const type = prod.itemName || 'unknown';
                typeCount[type] = (typeCount[type] || 0) + 1;
            });

            console.log('   商品タイプ別:');
            Object.entries(typeCount).forEach(([type, count]) => {
                console.log(`      ${type}: ${count}件`);
            });

            console.log('\n   最近の商品:');
            products.products.slice(0, 5).forEach((prod, index) => {
                console.log(`   ${index + 1}. "${prod.title}"`);
                console.log(`      商品タイプ: ${prod.itemName || 'N/A'}`);
                console.log(`      公開状態: ${prod.published ? '公開' : '下書き'}`);
                console.log(`      URL: ${prod.url}`);
            });
        }

        // ユーザー情報
        console.log('\n👤 ユーザー情報:');
        const user = await httpRequest('/api/v1/user');
        const username = user.user.name;
        console.log(`   ショップURL: https://suzuri.jp/${username}`);
        console.log(`   ダッシュボード: https://suzuri.jp/dashboard`);

        console.log('\n✅ 確認完了');
        console.log('\n📋 次のステップ:');
        console.log('   1. ショップURLをブラウザで開いて商品を確認');
        console.log('   2. 商品が表示されない場合は、APIで作成した商品がダッシュボードに');
        console.log('      反映されていない可能性があります');
        console.log('   3. デザイン生成画面から実際にSUZURI出品を試してみてください');

    } catch (error) {
        console.error('❌ エラー:', error.message);
    }
}

main();
