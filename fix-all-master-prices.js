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

// 38%利益率で末尾.99の価格を計算
function calculatePrice(cost, targetMargin = 38) {
  // 販売価格 = コスト / (1 - 利益率)
  const rawPrice = Math.ceil(cost / (1 - targetMargin / 100));

  // 末尾を.99にする
  const withNineNine = Math.floor(rawPrice / 100) * 100 + 99;

  return withNineNine;
}

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
          reject(new Error(`Failed to fetch product ${id}: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function updateProduct(id, productData) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(productData);

    const options = {
      hostname: 'api.printify.com',
      path: `/v1/shops/24565480/products/${id}.json`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to update product ${id}: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function fixMasterPrices(type, id) {
  console.log(`\n=== ${type} (${id}) ===`);

  try {
    // 商品取得
    const product = await getProduct(id);
    console.log(`商品名: ${product.title}`);
    console.log(`Blueprint: ${product.blueprint_id}`);
    console.log(`バリアント数: ${product.variants.length}個`);

    // 価格を修正
    const updatedVariants = product.variants.map(v => {
      const newPrice = calculatePrice(v.cost, 38);
      const actualMargin = ((newPrice - v.cost) / newPrice * 100).toFixed(1);

      return {
        id: v.id,
        price: newPrice,
        is_enabled: v.is_enabled
      };
    });

    // サンプル表示
    console.log('\n修正サンプル（最初の3バリアント）:');
    for (let i = 0; i < Math.min(3, product.variants.length); i++) {
      const oldV = product.variants[i];
      const newV = updatedVariants[i];
      const margin = ((newV.price - oldV.cost) / newV.price * 100).toFixed(1);
      console.log(`  ${oldV.title}:`);
      console.log(`    ¥${oldV.price} → ¥${newV.price} (利益率: ${margin}%)`);
    }

    // 更新データ作成
    const updateData = {
      title: product.title,
      description: product.description,
      blueprint_id: product.blueprint_id,
      print_provider_id: product.print_provider_id,
      variants: updatedVariants,
      print_areas: product.print_areas
    };

    // 更新実行
    console.log('\n更新中...');
    await updateProduct(id, updateData);
    console.log('✅ 更新完了');

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }
}

async function main() {
  console.log('\n========================================');
  console.log('マスター商品価格一括修正');
  console.log('目標: 利益率38%, 末尾.99');
  console.log('========================================');

  for (const [type, id] of Object.entries(masterIds)) {
    await fixMasterPrices(type, id);
    await new Promise(resolve => setTimeout(resolve, 1000)); // レート制限対策
  }

  console.log('\n========================================');
  console.log('すべてのマスター商品の価格修正が完了しました');
  console.log('========================================\n');
}

main();
