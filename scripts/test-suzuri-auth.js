// SUZURI API認証テストスクリプト
require('dotenv').config();

const https = require('https');

const SUZURI_ACCESS_TOKEN = process.env.SUZURI_ACCESS_TOKEN;

if (!SUZURI_ACCESS_TOKEN) {
    console.error('❌ SUZURI_ACCESS_TOKEN が .env に設定されていません');
    process.exit(1);
}

console.log('🔍 SUZURI API認証テスト開始\n');
console.log(`トークン: ${SUZURI_ACCESS_TOKEN.substring(0, 10)}...${SUZURI_ACCESS_TOKEN.substring(SUZURI_ACCESS_TOKEN.length - 10)}\n`);

async function testEndpoint(name, path, method = 'GET') {
    return new Promise((resolve) => {
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
                console.log(`\n📍 ${name}`);
                console.log(`   パス: ${path}`);
                console.log(`   ステータス: ${res.statusCode} ${res.statusMessage}`);

                if (res.statusCode === 200) {
                    console.log('   ✅ 認証成功');
                    try {
                        const json = JSON.parse(data);
                        console.log('   レスポンス:', JSON.stringify(json, null, 2).substring(0, 200) + '...');
                    } catch {
                        console.log('   レスポンス:', data.substring(0, 200));
                    }
                } else if (res.statusCode === 401) {
                    console.log('   ❌ 認証失敗: トークンが無効または期限切れ');
                } else if (res.statusCode === 404) {
                    console.log('   ❌ エンドポイントが見つかりません');
                } else {
                    console.log('   ⚠️  エラー:', data.substring(0, 200));
                }

                resolve({ status: res.statusCode, ok: res.statusCode === 200 });
            });
        });

        req.on('error', (error) => {
            console.log(`\n📍 ${name}`);
            console.log(`   ❌ リクエストエラー: ${error.message}`);
            resolve({ status: 0, ok: false });
        });

        req.end();
    });
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('SUZURI API エンドポイントテスト');
    console.log('='.repeat(60));

    const tests = [
        { name: 'ユーザー情報取得', path: '/api/v1/user' },
        { name: 'Materials一覧取得', path: '/api/v1/materials' },
        { name: 'Items一覧取得', path: '/api/v1/items' },
        { name: 'Products一覧取得', path: '/api/v1/products' }
    ];

    let successCount = 0;
    for (const test of tests) {
        const result = await testEndpoint(test.name, test.path);
        if (result.ok) successCount++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // レート制限対策
    }

    console.log('\n' + '='.repeat(60));
    console.log(`テスト結果: ${successCount}/${tests.length} 成功`);
    console.log('='.repeat(60));

    if (successCount === 0) {
        console.log('\n❌ 全てのエンドポイントで認証に失敗しました');
        console.log('\n対処法:');
        console.log('1. SUZURI管理画面でOAuth認証を再実行');
        console.log('   https://suzuri.jp/settings/api');
        console.log('2. 新しいアクセストークンを取得');
        console.log('3. .env の SUZURI_ACCESS_TOKEN を更新');
    } else if (successCount < tests.length) {
        console.log('\n⚠️  一部のエンドポイントで問題があります');
    } else {
        console.log('\n✅ 認証は正常です！');
        console.log('\n次のステップ:');
        console.log('1. デザイン生成画面でSUZURI出品をテスト');
        console.log('2. エラーが出る場合は、ブラウザコンソールのエラーメッセージを確認');
    }
}

runTests().catch(console.error);
