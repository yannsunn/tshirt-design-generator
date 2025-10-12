const https = require('https');

const apiKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6IjcwNmZkYTU1MjFiYWRkNGZhYWI2YmM1NWNlNGE3NzNhOTYyZGQ0MWNlZWIwYzczYmU1YmM3OTEyMDcwZTI2MTIyOGQ3Y2YyZGQ2YmEwMjBhIiwiaWF0IjoxNzU5MDg4ODEyLjQ2NzQ0MywibmJmIjoxNzU5MDg4ODEyLjQ2NzQ0NiwiZXhwIjoxNzkwNjI0ODEyLjQ1NzU2Miwic3ViIjoiMjQ4MjUxNzkiLCJzY29wZXMiOlsic2hvcHMubWFuYWdlIiwic2hvcHMucmVhZCIsImNhdGFsb2cucmVhZCIsIm9yZGVycy5yZWFkIiwib3JkZXJzLndyaXRlIiwicHJvZHVjdHMucmVhZCIsInByb2R1Y3RzLndyaXRlIiwid2ViaG9va3MucmVhZCIsIndlYmhvb2tzLndyaXRlIiwidXBsb2Fkcy5yZWFkIiwidXBsb2Fkcy53cml0ZSIsInByaW50X3Byb3ZpZGVycy5yZWFkIiwidXNlci5pbmZvIl19.Nkw1URM6xOcgTJXkZbC0-KwJP86k2CgfRw5ZSAu-vtoWLLIfjwPmTWBoWKqu2oq_Ntvpxe_Y9_rmWh-UELL4FuAMUJ-Ocb6_hpbpOoQ7U0b7A3AyEsPyAUOq8E78upyzR0rX5ucvUt7XLd3NHy7VRoER47q5NFKl_GgOmb5k-X27iKRr5mjW6fyHIvey0QWJsSuMQ3TzlbrUO5czYu7HLox_Tt1YFUFkNMXj2pmPIGVDhwbE2QZBmj0oWM5SKLz-ztAwBBefJgo_Sd8A5g6f7crt_Y1awcrabfdPxyEEn_4nIqKyCVAgwXFIePhmPK48_SMO_HzcnA9ikxdNm9Z3Up2-3xGFazwvyWJXGYBCrZSFaFNoRsIFA3n3tn3no9sJhp2v7NQHGmLepiKe_yIj-Xw6IX1_1JWu5kRfyimwMGjRNA1wtfitto8oa5iVaeDausesQheHPR4SdJqmzmuSuWqQDlqks3Tmjsp2887N3ZYKCRvSv21ouJLWBkx1f_Fqmn9mAuyFP7FIzMElzIDBmFRZ6Ae6Sg4FTBnvuzkoav2E3QnpMj02y7NeMKeI7uJ8_6rVKYwmcha0Xzoq16SPceaTaVxBU-pO96iEBNwHbw9k7Ovay_TQq8iD8TNlv8ArwyZCprw6H98zbHTlRrq1EAhtCuPY98-c9xqGd0XXODw';
const shopId = '24565480';

// 保持する8個の新しいマスターID
const keepMasterIds = new Set([
  '68eb804da0786662a60357d9', // tshirt
  '68eb8052aa2890fa97097970', // lightweight_tee
  '68eb8054a0786662a60357da', // ultra_cotton_tee
  '68eb8059aa2890fa97097974', // softstyle_tee
  '68eb805da0c8ed2f2c0f0314', // kids_tee
  '68eb8060ff3c0ac2d50ebd3f', // longsleeve
  '68eb8063a0786662a60357dd', // sweatshirt
  '68eb8068cb19b441780df848'  // hoodie
]);

async function getAllProducts(page = 1, allProducts = []) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.printify.com',
      path: `/v1/shops/${shopId}/products.json?limit=50&page=${page}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (!json.data) {
          reject(json);
          return;
        }

        allProducts = allProducts.concat(json.data);

        if (json.current_page < json.last_page) {
          resolve(getAllProducts(page + 1, allProducts));
        } else {
          resolve(allProducts);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function deleteProduct(id) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.printify.com',
      path: `/v1/shops/${shopId}/products/${id}.json`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    };

    const req = https.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.end();
  });
}

async function main() {
  console.log('\n=== 全商品取得中... ===\n');
  const allProducts = await getAllProducts();

  console.log(`総商品数: ${allProducts.length}個\n`);

  // 削除対象を特定
  const toDelete = allProducts.filter(p => !keepMasterIds.has(p.id));

  console.log(`保持するマスター: ${keepMasterIds.size}個`);
  keepMasterIds.forEach(id => {
    const product = allProducts.find(p => p.id === id);
    if (product) {
      console.log(`  ✅ ${product.title}`);
    } else {
      console.log(`  ⚠️ ${id} - 見つかりません`);
    }
  });

  console.log(`\n削除対象: ${toDelete.length}個\n`);

  if (toDelete.length === 0) {
    console.log('削除する商品がありません。');
    return;
  }

  // 削除実行
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i++) {
    const product = toDelete[i];
    console.log(`[${i + 1}/${toDelete.length}] 削除中: ${product.title} (${product.id})`);

    const success = await deleteProduct(product.id);
    if (success) {
      deleted++;
      console.log('  ✅ 削除完了');
    } else {
      console.log('  ❌ 削除失敗');
    }

    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 700));
  }

  console.log(`\n=== 完了 ===`);
  console.log(`削除成功: ${deleted}/${toDelete.length}個`);
  console.log(`残り商品: ${keepMasterIds.size}個（マスターのみ）`);
}

main().catch(console.error);
