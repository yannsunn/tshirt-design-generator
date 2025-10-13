// SUZURI ユーザー情報と商品URLを取得
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
    console.log('🔍 SUZURI ユーザー情報取得\n');

    // ユーザー情報取得
    const userInfo = await httpRequest('/api/v1/user');
    console.log('👤 ユーザー情報:');
    console.log(`   名前: ${userInfo.user.displayName}`);
    console.log(`   ユーザーID: ${userInfo.user.id}`);
    console.log(`   ユーザー名: ${userInfo.user.name}`);
    console.log(`   Email: ${userInfo.user.email}`);

    // 推測される管理画面URL
    const username = userInfo.user.name;
    console.log(`\n📋 推測される商品管理URL:`);
    console.log(`   ショップページ: https://suzuri.jp/${username}`);
    console.log(`   ダッシュボード: https://suzuri.jp/dashboard`);
    console.log(`   商品管理: https://suzuri.jp/dashboard/materials`);
    console.log(`   または: https://suzuri.jp/dashboard/products`);

    // Materials取得
    console.log(`\n📦 Materials（デザイン画像）:`);
    const materials = await httpRequest('/api/v1/materials?limit=5');
    console.log(`   登録数: ${materials.materials.length}件以上`);
    if (materials.materials.length > 0) {
        console.log(`   最新: "${materials.materials[0].title}"`);
        console.log(`   Material ID: ${materials.materials[0].id}`);
    }

    // Products取得
    console.log(`\n🛍️ Products（商品）:`);
    const products = await httpRequest('/api/v1/products?limit=5');
    console.log(`   登録数: ${products.products.length}件以上`);
    if (products.products.length > 0) {
        console.log(`   最新: "${products.products[0].title}"`);
        console.log(`   Product ID: ${products.products[0].id}`);
        console.log(`   URL: ${products.products[0].url}`);
    }

    console.log(`\n✅ 正しい管理画面URLは上記のいずれかです。`);
    console.log(`   ブラウザで各URLを試してみてください。`);
}

main().catch(console.error);
