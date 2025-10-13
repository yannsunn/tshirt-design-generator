// Check all products in Etsy shop including non-masters
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
    console.log('🔍 Etsyショップ (24566474) の全商品確認\n');

    try {
        const data = await getProducts(1);
        const products = data.data || [];

        console.log(`総商品数: ${products.length}件\n`);

        if (products.length === 0) {
            console.log('❌ Etsyショップに商品が1件もありません');
            console.log('\nPrintify UIでのコピー操作が失敗している可能性があります。');
            console.log('以下を確認してください:');
            console.log('1. コピー元のショップを正しく選択したか');
            console.log('2. コピー先としてEtsy (24566474) を選択したか');
            console.log('3. コピー実行後にエラーメッセージが表示されなかったか');
            return;
        }

        // Group by title pattern
        const masters = products.filter(p => p.title.includes('[MASTER]'));
        const regular = products.filter(p => !p.title.includes('[MASTER]'));

        console.log(`マスター商品: ${masters.length}件`);
        console.log(`通常商品: ${regular.length}件\n`);

        if (masters.length > 0) {
            console.log('✅ マスター商品が見つかりました:\n');
            masters.forEach(p => {
                console.log(`- ${p.title}`);
                console.log(`  ID: ${p.id}`);
                console.log(`  Blueprint: ${p.blueprint_id}`);
                console.log(`  作成日: ${p.created_at}\n`);
            });
        } else {
            console.log('❌ マスター商品が見つかりません\n');
            console.log('通常商品の一覧:');
            regular.slice(0, 10).forEach((p, i) => {
                console.log(`${i + 1}. ${p.title}`);
                console.log(`   ID: ${p.id}, Blueprint: ${p.blueprint_id}`);
            });

            if (regular.length > 10) {
                console.log(`\n... 他 ${regular.length - 10}件`);
            }
        }

        // Check for recent products (created in last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentProducts = products.filter(p => new Date(p.created_at) > oneHourAgo);

        if (recentProducts.length > 0) {
            console.log(`\n\n⏰ 直近1時間以内に作成された商品: ${recentProducts.length}件\n`);
            recentProducts.forEach(p => {
                console.log(`- ${p.title}`);
                console.log(`  ID: ${p.id}`);
                console.log(`  作成日: ${p.created_at}\n`);
            });
        }

    } catch (error) {
        console.error('❌ エラー:', error.message);
    }
}

main().catch(console.error);
