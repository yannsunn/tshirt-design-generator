// SUZURI テスト商品作成 - 公開画像URLを使用
require('dotenv').config();

const https = require('https');

const SUZURI_ACCESS_TOKEN = process.env.SUZURI_ACCESS_TOKEN;

// テスト用の公開画像URL（placeholder画像サービス）
const TEST_IMAGE_URL = 'https://via.placeholder.com/1000x1000/FF6B6B/FFFFFF?text=SUZURI+TEST';

async function httpRequest(path, method, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'suzuri.jp',
            path: path,
            method: method,
            headers: {
                'Authorization': `Bearer ${SUZURI_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`   ステータス: ${res.statusCode}`);
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch {
                        resolve(data);
                    }
                } else {
                    console.error(`   エラー: ${data.substring(0, 500)}`);
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    console.log('🧪 SUZURI テスト商品作成（Base64画像使用）\n');

    const now = new Date();
    const title = `テスト商品 - ${now.toLocaleString('ja-JP')}`;

    console.log(`📦 商品タイトル: ${title}`);
    console.log(`📤 Material + Products 作成中...\n`);

    const materialBody = {
        texture: TEST_IMAGE_URL,  // 公開画像URL
        title: title,
        description: 'システムテスト用の商品です',
        products: [
            { itemId: 1, published: false, resizeMode: 'contain' },    // Tシャツ（下書き）
            { itemId: 2, published: false, resizeMode: 'contain' },    // トートバッグ（下書き）
            { itemId: 3, published: false, resizeMode: 'contain' }     // マグカップ（下書き）
        ]
    };

    try {
        const result = await httpRequest('/api/v1/materials', 'POST', materialBody);

        console.log(`\n✅ Material作成成功！`);
        console.log(`   Material ID: ${result.id}`);
        console.log(`   Products作成: ${result.products ? result.products.length : 0}件`);

        if (result.products && result.products.length > 0) {
            console.log(`\n📦 作成された商品:`);
            result.products.forEach((prod, index) => {
                console.log(`   ${index + 1}. ${prod.title || 'N/A'}`);
                console.log(`      公開状態: ${prod.published ? '公開' : '下書き'}`);
                console.log(`      URL: ${prod.url || 'N/A'}`);
            });
        }

        console.log(`\n✅ テスト成功！`);
        console.log(`\n📋 確認方法:`);
        console.log(`   1. ショップを開く: https://suzuri.jp/Awake`);
        console.log(`   2. ダッシュボードを開く: https://suzuri.jp/dashboard`);
        console.log(`   3. 「グッズ」タブで下書き商品を確認`);
        console.log(`\n💡 ヒント:`);
        console.log(`   - 下書き状態なので、一般には表示されません`);
        console.log(`   - ダッシュボードで確認してから、公開設定してください`);

    } catch (error) {
        console.error(`\n❌ Material作成失敗: ${error.message}`);
        console.log(`\n考えられる原因:`);
        console.log(`   1. ACCESS_TOKENに商品作成権限（products:write）がない`);
        console.log(`   2. Base64画像のフォーマットが不正`);
        console.log(`   3. APIのレート制限に達した`);
        console.log(`\n対処法:`);
        console.log(`   1. SUZURI管理画面でAPI設定を確認:`);
        console.log(`      https://suzuri.jp/settings/api`);
        console.log(`   2. OAuth認証を再実行して、全権限を付与`);
        console.log(`   3. 新しいACCESS_TOKENを.envに設定`);
    }
}

main().catch(error => {
    console.error('❌ 予期しないエラー:', error);
});
