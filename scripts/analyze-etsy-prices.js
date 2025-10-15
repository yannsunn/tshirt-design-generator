// Etsyの実際の価格を分析するスクリプト

const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6IjcwNmZkYTU1MjFiYWRkNGZhYWI2YmM1NWNlNGE3NzNhOTYyZGQ0MWNlZWIwYzczYmU1YmM3OTEyMDcwZTI2MTIyOGQ3Y2YyZGQ2YmEwMjBhIiwiaWF0IjoxNzU5MDg4ODEyLjQ2NzQ0MywibmJmIjoxNzU5MDg4ODEyLjQ2NzQ0NiwiZXhwIjoxNzkwNjI0ODEyLjQ1NzU2Miwic3ViIjoiMjQ4MjUxNzkiLCJzY29wZXMiOlsic2hvcHMubWFuYWdlIiwic2hvcHMucmVhZCIsImNhdGFsb2cucmVhZCIsIm9yZGVycy5yZWFkIiwib3JkZXJzLndyaXRlIiwicHJvZHVjdHMucmVhZCIsInByb2R1Y3RzLndyaXRlIiwid2ViaG9va3MucmVhZCIsIndlYmhvb2tzLndyaXRlIiwidXBsb2Fkcy5yZWFkIiwidXBsb2Fkcy53cml0ZSIsInByaW50X3Byb3ZpZGVycy5yZWFkIiwidXNlci5pbmZvIl19.Nkw1URM6xOcgTJXkZbC0-KwJP86k2CgfRw5ZSAu-vtoWLLIfjwPmTWBoWKqu2oq_Ntvpxe_Y9_rmWh-UELL4FuAMUJ-Ocb6_hpbpOoQ7U0b7A3AyEsPyAUOq8E78upyzR0rX5ucvUt7XLd3NHy7VRoER47q5NFKl_GgOmb5k-X27iKRr5mjW6fyHIvey0QWJsSuMQ3TzlbrUO5czYu7HLox_Tt1YFUFkNMXj2pmPIGVDhwbE2QZBmj0oWM5SKLz-ztAwBBefJgo_Sd8A5g6f7crt_Y1awcrabfdPxyEEn_4nIqKyCVAgwXFIePhmPK48_SMO_HzcnA9ikxdNm9Z3Up2-3xGFazwvyWJXGYBCrZSFaFNoRsIFA3n3tn3no9sJhp2v7NQHGmLepiKe_yIj-Xw6IX1_1JWu5kRfyimwMGjRNA1wtfitto8oa5iVaeDausesQheHPR4SdJqmzmuSuWqQDlqks3Tmjsp2887N3ZYKCRvSv21ouJLWBkx1f_Fqmn9mAuyFP7FIzMElzIDBmFRZ6Ae6Sg4FTBnvuzkoav2E3QnpMj02y7NeMKeI7uJ8_6rVKYwmcha0Xzoq16SPceaTaVxBU-pO96iEBNwHbw9k7Ovay_TQq8iD8TNlv8ArwyZCprw6H98zbHTlRrq1EAhtCuPY98-c9xqGd0XXODw';
const ETSY_SHOP_ID = '24566474';

async function analyzeEtsyPrices() {
    console.log('🔍 Etsyの実際の価格を分析中...\n');

    const response = await fetch(
        `https://api.printify.com/v1/shops/${ETSY_SHOP_ID}/products.json?limit=10`,
        {
            headers: {
                'Authorization': `Bearer ${PRINTIFY_API_KEY}`
            }
        }
    );

    const data = await response.json();

    console.log(`📦 ${data.data.length}個の商品を取得\n`);

    // 各商品の最初の数バリアントを分析
    for (const product of data.data.slice(0, 3)) {
        console.log(`\n📋 ${product.title}`);
        console.log(`Blueprint ID: ${product.blueprint_id}\n`);

        const variants = product.variants.slice(0, 6);

        for (const variant of variants) {
            const costUsd = variant.cost / 100;
            const priceUsd = variant.price / 100;
            const margin = ((variant.price - variant.cost) / variant.price * 100).toFixed(1);
            const multiplier = (variant.price / variant.cost).toFixed(2);

            console.log(
                `${variant.title.padEnd(25)} ` +
                `Cost:$${costUsd.toFixed(2)} ` +
                `Price:$${priceUsd.toFixed(2)} ` +
                `Margin:${margin}% ` +
                `(${multiplier}x)`
            );
        }
    }

    // 価格計算式を逆算
    console.log('\n\n🧮 価格計算式の分析:\n');

    const firstProduct = data.data[0];
    const sampleVariants = firstProduct.variants.slice(0, 8);

    for (const variant of sampleVariants) {
        const costUsd = variant.cost / 100;
        const priceUsd = variant.price / 100;
        const multiplier = priceUsd / costUsd;

        // $X.99形式かチェック
        const is99Format = (priceUsd * 100) % 100 === 99;

        // マージン計算
        const margin = ((priceUsd - costUsd) / priceUsd * 100).toFixed(1);

        console.log(
            `Cost:$${costUsd.toFixed(2)} → Price:$${priceUsd.toFixed(2)} ` +
            `(${multiplier.toFixed(2)}x, ${margin}%, ${is99Format ? '✓' : '✗'}$X.99)`
        );
    }
}

analyzeEtsyPrices().catch(console.error);
