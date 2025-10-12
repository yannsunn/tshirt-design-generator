const https = require('https');

const apiKey = process.env.PRINTIFY_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6IjcwNmZkYTU1MjFiYWRkNGZhYWI2YmM1NWNlNGE3NzNhOTYyZGQ0MWNlZWIwYzczYmU1YmM3OTEyMDcwZTI2MTIyOGQ3Y2YyZGQ2YmEwMjBhIiwiaWF0IjoxNzU5MDg4ODEyLjQ2NzQ0MywibmJmIjoxNzU5MDg4ODEyLjQ2NzQ0NiwiZXhwIjoxNzkwNjI0ODEyLjQ1NzU2Miwic3ViIjoiMjQ4MjUxNzkiLCJzY29wZXMiOlsic2hvcHMubWFuYWdlIiwic2hvcHMucmVhZCIsImNhdGFsb2cucmVhZCIsIm9yZGVycy5yZWFkIiwib3JkZXJzLndyaXRlIiwicHJvZHVjdHMucmVhZCIsInByb2R1Y3RzLndyaXRlIiwid2ViaG9va3MucmVhZCIsIndlYmhvb2tzLndyaXRlIiwidXBsb2Fkcy5yZWFkIiwidXBsb2Fkcy53cml0ZSIsInByaW50X3Byb3ZpZGVycy5yZWFkIiwidXNlci5pbmZvIl19.Nkw1URM6xOcgTJXkZbC0-KwJP86k2CgfRw5ZSAu-vtoWLLIfjwPmTWBoWKqu2oq_Ntvpxe_Y9_rmWh-UELL4FuAMUJ-Ocb6_hpbpOoQ7U0b7A3AyEsPyAUOq8E78upyzR0rX5ucvUt7XLd3NHy7VRoER47q5NFKl_GgOmb5k-X27iKRr5mjW6fyHIvey0QWJsSuMQ3TzlbrUO5czYu7HLox_Tt1YFUFkNMXj2pmPIGVDhwbE2QZBmj0oWM5SKLz-ztAwBBefJgo_Sd8A5g6f7crt_Y1awcrabfdPxyEEn_4nIqKyCVAgwXFIePhmPK48_SMO_HzcnA9ikxdNm9Z3Up2-3xGFazwvyWJXGYBCrZSFaFNoRsIFA3n3tn3no9sJhp2v7NQHGmLepiKe_yIj-Xw6IX1_1JWu5kRfyimwMGjRNA1wtfitto8oa5iVaeDausesQheHPR4SdJqmzmuSuWqQDlqks3Tmjsp2887N3ZYKCRvSv21ouJLWBkx1f_Fqmn9mAuyFP7FIzMElzIDBmFRZ6Ae6Sg4FTBnvuzkoav2E3QnpMj02y7NeMKeI7uJ8_6rVKYwmcha0Xzoq16SPceaTaVxBU-pO96iEBNwHbw9k7Ovay_TQq8iD8TNlv8ArwyZCprw6H98zbHTlRrq1EAhtCuPY98-c9xqGd0XXODw';

const masterIds = {
  tshirt: '68eb804da0786662a60357d9',
  lightweight_tee: '68eb8052aa2890fa97097970',
  ultra_cotton_tee: '68eb8054a0786662a60357da',
  softstyle_tee: '68eb8059aa2890fa97097974',
  kids_tee: '68eb805da0c8ed2f2c0f0314',
  longsleeve: '68eb8060ff3c0ac2d50ebd3f',
  sweatshirt: '68eb8063a0786662a60357dd',
  hoodie: '68eb8068cb19b441780df848'
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
          reject(new Error(`Failed to fetch product ${id}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('\n=== マスター商品の価格確認 ===\n');

  for (const [type, id] of Object.entries(masterIds)) {
    try {
      const product = await getProduct(id);

      console.log(`\n${type} (Blueprint ${product.blueprint_id}): ${product.title}`);
      console.log(`バリアント数: ${product.variants.length}個`);

      // 価格分析
      const prices = product.variants.map(v => ({
        cost: v.cost,
        price: v.price,
        margin: ((v.price - v.cost) / v.price * 100).toFixed(1),
        title: v.title
      }));

      // サンプル表示（最初の3つ）
      console.log('\nサンプル価格（最初の3バリアント）:');
      prices.slice(0, 3).forEach(p => {
        console.log(`  ${p.title}: コスト¥${p.cost} → 販売¥${p.price} (利益率 ${p.margin}%)`);
      });

      // 利益率チェック
      const margins = prices.map(p => parseFloat(p.margin));
      const avgMargin = (margins.reduce((a, b) => a + b, 0) / margins.length).toFixed(1);
      const minMargin = Math.min(...margins).toFixed(1);
      const maxMargin = Math.max(...margins).toFixed(1);

      console.log(`\n利益率: 平均${avgMargin}%, 最小${minMargin}%, 最大${maxMargin}%`);

      if (avgMargin >= 37 && avgMargin <= 39) {
        console.log('✅ 利益率38%で設定されています');
      } else {
        console.log(`⚠️ 利益率が38%から外れています`);
      }

    } catch (error) {
      console.error(`❌ ${type}: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 700));
  }

  console.log('\n=== 確認完了 ===\n');
}

main();
