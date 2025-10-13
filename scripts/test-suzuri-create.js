// SUZURI テスト出品 - 1件の商品を作成
require('dotenv').config();

const https = require('https');

const SUZURI_ACCESS_TOKEN = process.env.SUZURI_ACCESS_TOKEN;

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
                    console.error(`   エラーレスポンス: ${data}`);
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    console.log('🧪 SUZURI テスト出品\n');

    // テスト用の画像URL（SUZURIのサンプル画像）
    const testImageUrl = 'https://suzuri.jp/static/images/material-sample.jpg';

    // または、既存のMaterialを使用
    console.log('📋 既存のMaterialを取得中...');
    const materials = await httpRequest('/api/v1/materials?limit=1', 'GET');

    let materialId;
    if (materials.materials && materials.materials.length > 0) {
        materialId = materials.materials[0].id;
        console.log(`   ✅ 既存Material使用: ID ${materialId}\n`);
    } else {
        console.log('   ⚠️  既存Materialがないため、新規作成します\n');
    }

    if (!materialId) {
        // 新しいMaterialを作成
        console.log('📤 Material作成中...');
        const materialBody = {
            texture: testImageUrl,
            title: 'テスト商品 - ' + new Date().toLocaleString('ja-JP'),
            description: 'システムテスト用',
            products: [
                { itemId: 1, published: true, resizeMode: 'contain' }  // Tシャツ1種類のみ
            ]
        };

        try {
            const result = await httpRequest('/api/v1/materials', 'POST', materialBody);
            console.log(`   ✅ Material作成成功: ID ${result.id}`);
            console.log(`   ✅ Products作成: ${result.products ? result.products.length : 0}件\n`);

            if (result.products && result.products.length > 0) {
                console.log('📦 作成された商品:');
                result.products.forEach((prod, index) => {
                    console.log(`   ${index + 1}. ${prod.title || 'N/A'}`);
                    console.log(`      URL: ${prod.url || 'N/A'}`);
                });
            }

            console.log('\n✅ テスト成功！');
            console.log('\n📋 確認方法:');
            console.log('   1. ショップを開く: https://suzuri.jp/Awake');
            console.log('   2. ダッシュボードを開く: https://suzuri.jp/dashboard');
            console.log('   3. 商品が表示されているか確認');

        } catch (error) {
            console.error('\n❌ Material作成失敗:', error.message);
            console.log('\n原因の可能性:');
            console.log('   1. ACCESS_TOKENに商品作成権限がない');
            console.log('   2. 画像URLが無効');
            console.log('   3. リクエストパラメータが不正');
            console.log('\n対処法:');
            console.log('   1. SUZURI管理画面でOAuth認証を再実行');
            console.log('   2. スコープに "products:write" が含まれているか確認');
        }
    } else {
        // 既存Materialに新しいProductを追加
        console.log('📤 既存MaterialにProduct追加中...');
        const productBody = {
            itemId: 1,  // Tシャツ
            published: true,
            resizeMode: 'contain'
        };

        try {
            const result = await httpRequest(`/api/v1/materials/${materialId}/products`, 'POST', productBody);
            console.log(`   ✅ Product作成成功: ID ${result.id}`);
            console.log(`   URL: ${result.url || 'N/A'}\n`);

            console.log('✅ テスト成功！');
            console.log('\n📋 確認方法:');
            console.log('   1. ショップを開く: https://suzuri.jp/Awake');
            console.log('   2. 新しい商品が表示されているか確認');

        } catch (error) {
            console.error('\n❌ Product作成失敗:', error.message);
        }
    }
}

main().catch(error => {
    console.error('❌ 予期しないエラー:', error);
});
