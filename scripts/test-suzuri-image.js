// SUZURIに送信される画像URLをテスト

const SUZURI_ACCESS_TOKEN = process.env.SUZURI_ACCESS_TOKEN || '';

// テスト用の公開画像URL（確実にアクセスできるURL）
const TEST_PUBLIC_IMAGE = 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=3307&h=3898&fit=crop';

async function testSuzuriImageUpload() {
    console.log('🧪 SUZURI画像URL テスト\n');
    console.log('=' .repeat(80));

    // テスト1: 公開画像URLで成功するかテスト
    console.log('\n📋 テスト1: 公開画像URLでMaterial作成');
    console.log(`   画像URL: ${TEST_PUBLIC_IMAGE}`);

    try {
        const response = await fetch('https://suzuri.jp/api/v1/materials', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUZURI_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                texture: TEST_PUBLIC_IMAGE,
                title: 'Test Image Upload',
                products: [
                    { itemId: 1, published: false, resizeMode: 'contain' }
                ]
            })
        });

        console.log(`   Status: ${response.status}`);

        if (response.ok) {
            const result = await response.json();
            console.log('   ✅ 成功！Material ID:', result.id);
            console.log('   ✅ Products作成:', result.products?.length || 0, '件');
        } else {
            const errorText = await response.text();
            console.error('   ❌ 失敗:', errorText.substring(0, 500));
        }
    } catch (error) {
        console.error('   ❌ エラー:', error.message);
    }

    // テスト2: Printify画像URLの取得と検証
    console.log('\n\n📋 テスト2: Printify商品から実際の画像URLを取得');

    const PRINTIFY_API_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6IjcwNmZkYTU1MjFiYWRkNGZhYWI2YmM1NWNlNGE3NzNhOTYyZGQ0MWNlZWIwYzczYmU1YmM3OTEyMDcwZTI2MTIyOGQ3Y2YyZGQ2YmEwMjBhIiwiaWF0IjoxNzU5MDg4ODEyLjQ2NzQ0MywibmJmIjoxNzU5MDg4ODEyLjQ2NzQ0NiwiZXhwIjoxNzkwNjI0ODEyLjQ1NzU2Miwic3ViIjoiMjQ4MjUxNzkiLCJzY29wZXMiOlsic2hvcHMubWFuYWdlIiwic2hvcHMucmVhZCIsImNhdGFsb2cucmVhZCIsIm9yZGVycy5yZWFkIiwib3JkZXJzLndyaXRlIiwicHJvZHVjdHMucmVhZCIsInByb2R1Y3RzLndyaXRlIiwid2ViaG9va3MucmVhZCIsIndlYmhvb2tzLndyaXRlIiwidXBsb2Fkcy5yZWFkIiwidXBsb2Fkcy53cml0ZSIsInByaW50X3Byb3ZpZGVycy5yZWFkIiwidXNlci5pbmZvIl19.Nkw1URM6xOcgTJXkZbC0-KwJP86k2CgfRw5ZSAu-vtoWLLIfjwPmTWBoWKqu2oq_Ntvpxe_Y9_rmWh-UELL4FuAMUJ-Ocb6_hpbpOoQ7U0b7A3AyEsPyAUOq8E78upyzR0rX5ucvUt7XLd3NHy7VRoER47q5NFKl_GgOmb5k-X27iKRr5mjW6fyHIvey0QWJsSuMQ3TzlbrUO5czYu7HLox_Tt1YFUFkNMXj2pmPIGVDhwbE2QZBmj0oWM5SKLz-ztAwBBefJgo_Sd8A5g6f7crt_Y1awcrabfdPxyEEn_4nIqKyCVAgwXFIePhmPK48_SMO_HzcnA9ikxdNm9Z3Up2-3xGFazwvyWJXGYBCrZSFaFNoRsIFA3n3tn3no9sJhp2v7NQHGmLepiKe_yIj-Xw6IX1_1JWu5kRfyimwMGjRNA1wtfitto8oa5iVaeDausesQheHPR4SdJqmzmuSuWqQDlqks3Tmjsp2887N3ZYKCRvSv21ouJLWBkx1f_Fqmn9mAuyFP7FIzMElzIDBmFRZ6Ae6Sg4FTBnvuzkoav2E3QnpMj02y7NeMKeI7uJ8_6rVKYwmcha0Xzoq16SPceaTaVxBU-pO96iEBNwHbw9k7Ovay_TQq8iD8TNlv8ArwyZCprw6H98zbHTlRrq1EAhtCuPY98-c9xqGd0XXODw';
    const SHOP_ID = '24565480';

    try {
        const productsResponse = await fetch(
            `https://api.printify.com/v1/shops/${SHOP_ID}/products.json?limit=1`,
            {
                headers: { 'Authorization': `Bearer ${PRINTIFY_API_KEY}` }
            }
        );

        const productsData = await productsResponse.json();
        const firstProduct = productsData.data[0];

        if (firstProduct && firstProduct.images && firstProduct.images.length > 0) {
            const printifyImage = firstProduct.images[0];
            console.log('   Printify画像情報:');
            console.log(`     - src: ${printifyImage.src}`);
            console.log(`     - width: ${printifyImage.width}px`);
            console.log(`     - height: ${printifyImage.height}px`);

            // このURLにアクセスできるか確認
            console.log('\n   🔍 SUZURIからアクセス可能かテスト中...');

            try {
                const imageCheckResponse = await fetch(printifyImage.src, { method: 'HEAD' });
                console.log(`   Status: ${imageCheckResponse.status}`);
                console.log(`   Content-Type: ${imageCheckResponse.headers.get('content-type')}`);
                console.log(`   Content-Length: ${imageCheckResponse.headers.get('content-length')}`);

                if (imageCheckResponse.ok) {
                    console.log('   ✅ 画像URLは公開アクセス可能');
                } else {
                    console.log('   ❌ 画像URLは公開アクセス不可（認証が必要な可能性）');
                }
            } catch (err) {
                console.log('   ❌ アクセスエラー:', err.message);
            }

            // SUZURIでこのURLを使ってMaterial作成をテスト
            console.log('\n   🧪 このURLでSUZURI Material作成をテスト...');

            try {
                const suzuriTestResponse = await fetch('https://suzuri.jp/api/v1/materials', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${SUZURI_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        texture: printifyImage.src,
                        title: 'Test Printify Image',
                        products: [
                            { itemId: 1, published: false, resizeMode: 'contain' }
                        ]
                    })
                });

                console.log(`   Status: ${suzuriTestResponse.status}`);

                if (suzuriTestResponse.ok) {
                    const result = await suzuriTestResponse.json();
                    console.log('   ✅ 成功！Printify画像URLはSUZURIで使用可能');
                    console.log('   Material ID:', result.id);
                } else {
                    const errorText = await suzuriTestResponse.text();
                    console.error('   ❌ 失敗:', errorText.substring(0, 500));

                    if (suzuriTestResponse.status === 422) {
                        console.log('\n   💡 422エラー: 画像URLまたは画像サイズが不適切');
                        console.log('   原因候補:');
                        console.log('     1. PrintifyのURLにSUZURIがアクセスできない');
                        console.log('     2. 画像サイズが大きすぎる or 小さすぎる');
                        console.log('     3. 画像形式が非対応（PNG/JPGのみ対応）');
                    }
                }
            } catch (error) {
                console.error('   ❌ エラー:', error.message);
            }

        } else {
            console.log('   ⚠️ Printify商品に画像が見つかりませんでした');
        }

    } catch (error) {
        console.error('   ❌ Printify APIエラー:', error.message);
    }

    console.log('\n' + '='.repeat(80));
    console.log('🏁 テスト完了\n');
}

testSuzuriImageUpload().catch(console.error);
