// デプロイされたSUZURI APIをテスト

async function testDeployedSuzuriAPI() {
    console.log('🧪 デプロイされたSUZURI APIをテスト\n');

    const testData = {
        imageUrl: 'https://images-api.printify.com/mockup/68ef303002e6a73871034072/32912/98424/modern-japanese-design-t-shirt-shiba-inu-dog-motif.jpg',
        title: 'Test Design',
        createStandardTshirt: true,
        createToteBag: false,
        createMug: false,
        createPhoneCase: false,
        createSweatshirt: false,
        published: false
    };

    console.log('📤 リクエスト送信中...');
    console.log(`   URL: https://design-generator-puce.vercel.app/api/suzuri-batch-create`);
    console.log(`   画像: ${testData.imageUrl.substring(0, 80)}...`);

    try {
        const response = await fetch('https://design-generator-puce.vercel.app/api/suzuri-batch-create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        console.log(`\n📥 レスポンス: ${response.status} ${response.statusText}`);

        const result = await response.json();

        if (response.ok) {
            console.log('✅ 成功！');
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.log('❌ 失敗！');
            console.log(JSON.stringify(result, null, 2));
        }

    } catch (error) {
        console.error('❌ エラー:', error.message);
    }
}

testDeployedSuzuriAPI().catch(console.error);
