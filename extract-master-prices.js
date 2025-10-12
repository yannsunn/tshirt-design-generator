const https = require('https');
const fs = require('fs');

const apiKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6IjcwNmZkYTU1MjFiYWRkNGZhYWI2YmM1NWNlNGE3NzNhOTYyZGQ0MWNlZWIwYzczYmU1YmM3OTEyMDcwZTI2MTIyOGQ3Y2YyZGQ2YmEwMjBhIiwiaWF0IjoxNzU5MDg4ODEyLjQ2NzQ0MywibmJmIjoxNzU5MDg4ODEyLjQ2NzQ0NiwiZXhwIjoxNzkwNjI0ODEyLjQ1NzU2Miwic3ViIjoiMjQ4MjUxNzkiLCJzY29wZXMiOlsic2hvcHMubWFuYWdlIiwic2hvcHMucmVhZCIsImNhdGFsb2cucmVhZCIsIm9yZGVycy5yZWFkIiwib3JkZXJzLndyaXRlIiwicHJvZHVjdHMucmVhZCIsInByb2R1Y3RzLndyaXRlIiwid2ViaG9va3MucmVhZCIsIndlYmhvb2tzLndyaXRlIiwidXBsb2Fkcy5yZWFkIiwidXBsb2Fkcy53cml0ZSIsInByaW50X3Byb3ZpZGVycy5yZWFkIiwidXNlci5pbmZvIl19.Nkw1URM6xOcgTJXkZbC0-KwJP86k2CgfRw5ZSAu-vtoWLLIfjwPmTWBoWKqu2oq_Ntvpxe_Y9_rmWh-UELL4FuAMUJ-Ocb6_hpbpOoQ7U0b7A3AyEsPyAUOq8E78upyzR0rX5ucvUt7XLd3NHy7VRoER47q5NFKl_GgOmb5k-X27iKRr5mjW6fyHIvey0QWJsSuMQ3TzlbrUO5czYu7HLox_Tt1YFUFkNMXj2pmPIGVDhwbE2QZBmj0oWM5SKLz-ztAwBBefJgo_Sd8A5g6f7crt_Y1awcrabfdPxyEEn_4nIqKyCVAgwXFIePhmPK48_SMO_HzcnA9ikxdNm9Z3Up2-3xGFazwvyWJXGYBCrZSFaFNoRsIFA3n3tn3no9sJhp2v7NQHGmLepiKe_yIj-Xw6IX1_1JWu5kRfyimwMGjRNA1wtfitto8oa5iVaeDausesQheHPR4SdJqmzmuSuWqQDlqks3Tmjsp2887N3ZYKCRvSv21ouJLWBkx1f_Fqmn9mAuyFP7FIzMElzIDBmFRZ6Ae6Sg4FTBnvuzkoav2E3QnpMj02y7NeMKeI7uJ8_6rVKYwmcha0Xzoq16SPceaTaVxBU-pO96iEBNwHbw9k7Ovay_TQq8iD8TNlv8ArwyZCprw6H98zbHTlRrq1EAhtCuPY98-c9xqGd0XXODw';

const masterIds = {
  tshirt: { id: '68eb804da0786662a60357d9', blueprint: 6, name: 'Gildan 5000' },
  lightweight_tee: { id: '68eb8052aa2890fa97097970', blueprint: 26, name: 'Gildan 980' },
  ultra_cotton_tee: { id: '68eb8054a0786662a60357da', blueprint: 36, name: 'Gildan 2000' },
  softstyle_tee: { id: '68eb8059aa2890fa97097974', blueprint: 145, name: 'Gildan 64000' },
  kids_tee: { id: '68eb805da0c8ed2f2c0f0314', blueprint: 157, name: 'Gildan 5000B' },
  longsleeve: { id: '68eb8060ff3c0ac2d50ebd3f', blueprint: 80, name: 'Gildan 2400' },
  sweatshirt: { id: '68eb8063a0786662a60357dd', blueprint: 49, name: 'Gildan 18000' },
  hoodie: { id: '68eb8068cb19b441780df848', blueprint: 77, name: 'Gildan 18500' }
};

async function getProduct(id) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.printify.com',
      path: `/v1/shops/24565480/products/${id}.json`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to fetch ${id}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('\n=== マスター商品の価格データ抽出 ===\n');

  const priceData = {};

  for (const [type, info] of Object.entries(masterIds)) {
    try {
      console.log(`${type} (Blueprint ${info.blueprint}) を取得中...`);
      const product = await getProduct(info.id);

      // バリアントごとの価格データを集計
      const variantPrices = {};

      product.variants.forEach(v => {
        // サイズを抽出
        const sizeMatch = v.title.match(/\b(XS|S|M|L|XL|2XL|3XL|4XL|5XL|Youth S|Youth M|Youth L|Youth XL)\b/);
        const size = sizeMatch ? sizeMatch[0] : 'default';

        if (!variantPrices[size]) {
          variantPrices[size] = { cost: v.cost, price: v.price, count: 1 };
        } else {
          // 同じサイズの場合は平均を取る
          variantPrices[size].count++;
        }
      });

      priceData[info.blueprint] = {
        name: info.name,
        type: type,
        totalVariants: product.variants.length,
        prices: variantPrices
      };

      console.log(`  ✅ ${product.variants.length}バリアント取得`);

    } catch (error) {
      console.error(`  ❌ ${type}: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 700));
  }

  // JSONファイルに保存
  const outputPath = './master-pricing-reference.json';
  fs.writeFileSync(outputPath, JSON.stringify(priceData, null, 2));
  console.log(`\n✅ 価格データを保存: ${outputPath}`);

  // サマリー表示
  console.log('\n=== 価格サマリー ===\n');
  Object.entries(priceData).forEach(([blueprintId, data]) => {
    console.log(`Blueprint ${blueprintId} (${data.name}):`);
    const sampleSizes = Object.entries(data.prices).slice(0, 3);
    sampleSizes.forEach(([size, info]) => {
      const margin = ((info.price - info.cost) / info.price * 100).toFixed(1);
      console.log(`  ${size}: ¥${info.cost} → ¥${info.price} (利益率 ${margin}%)`);
    });
    console.log('');
  });

  console.log('\n次のステップ:');
  console.log('1. lib/blueprintCosts.js を更新');
  console.log('2. システムのテスト');
  console.log('');
}

main();
