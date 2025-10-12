const https = require('https');

async function getAllProducts(page = 1, allProducts = []) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.printify.com',
      path: `/v1/shops/24565480/products.json?limit=50&page=${page}`,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6IjcwNmZkYTU1MjFiYWRkNGZhYWI2YmM1NWNlNGE3NzNhOTYyZGQ0MWNlZWIwYzczYmU1YmM3OTEyMDcwZTI2MTIyOGQ3Y2YyZGQ2YmEwMjBhIiwiaWF0IjoxNzU5MDg4ODEyLjQ2NzQ0MywibmJmIjoxNzU5MDg4ODEyLjQ2NzQ0NiwiZXhwIjoxNzkwNjI0ODEyLjQ1NzU2Miwic3ViIjoiMjQ4MjUxNzkiLCJzY29wZXMiOlsic2hvcHMubWFuYWdlIiwic2hvcHMucmVhZCIsImNhdGFsb2cucmVhZCIsIm9yZGVycy5yZWFkIiwib3JkZXJzLndyaXRlIiwicHJvZHVjdHMucmVhZCIsInByb2R1Y3RzLndyaXRlIiwid2ViaG9va3MucmVhZCIsIndlYmhvb2tzLndyaXRlIiwidXBsb2Fkcy5yZWFkIiwidXBsb2Fkcy53cml0ZSIsInByaW50X3Byb3ZpZGVycy5yZWFkIiwidXNlci5pbmZvIl19.Nkw1URM6xOcgTJXkZbC0-KwJP86k2CgfRw5ZSAu-vtoWLLIfjwPmTWBoWKqu2oq_Ntvpxe_Y9_rmWh-UELL4FuAMUJ-Ocb6_hpbpOoQ7U0b7A3AyEsPyAUOq8E78upyzR0rX5ucvUt7XLd3NHy7VRoER47q5NFKl_GgOmb5k-X27iKRr5mjW6fyHIvey0QWJsSuMQ3TzlbrUO5czYu7HLox_Tt1YFUFkNMXj2pmPIGVDhwbE2QZBmj0oWM5SKLz-ztAwBBefJgo_Sd8A5g6f7crt_Y1awcrabfdPxyEEn_4nIqKyCVAgwXFIePhmPK48_SMO_HzcnA9ikxdNm9Z3Up2-3xGFazwvyWJXGYBCrZSFaFNoRsIFA3n3tn3no9sJhp2v7NQHGmLepiKe_yIj-Xw6IX1_1JWu5kRfyimwMGjRNA1wtfitto8oa5iVaeDausesQheHPR4SdJqmzmuSuWqQDlqks3Tmjsp2887N3ZYKCRvSv21ouJLWBkx1f_Fqmn9mAuyFP7FIzMElzIDBmFRZ6Ae6Sg4FTBnvuzkoav2E3QnpMj02y7NeMKeI7uJ8_6rVKYwmcha0Xzoq16SPceaTaVxBU-pO96iEBNwHbw9k7Ovay_TQq8iD8TNlv8ArwyZCprw6H98zbHTlRrq1EAhtCuPY98-c9xqGd0XXODw'
      }
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

getAllProducts().then(products => {
  const masters = products.filter(p => p.title.includes('MASTER'));

  // Blueprint別に分類
  const blueprintMap = {
    6: 'tshirt',
    26: 'lightweight_tee',
    36: 'ultra_cotton_tee',
    145: 'softstyle_tee',
    157: 'kids_tee',
    80: 'longsleeve',
    49: 'sweatshirt',
    77: 'hoodie'
  };

  const byBlueprint = {};
  masters.forEach(m => {
    const type = blueprintMap[m.blueprint_id];
    if (!byBlueprint[type]) byBlueprint[type] = [];
    byBlueprint[type].push(m);
  });

  console.log('\n=== Blueprint別マスター商品 ===\n');
  Object.keys(blueprintMap).forEach(blueprintId => {
    const type = blueprintMap[blueprintId];
    const items = byBlueprint[type] || [];
    console.log(`${type} (Blueprint ${blueprintId}):`);
    items.forEach(m => {
      const isNew = m.id.startsWith('68eb80'); // 新しいマスターのIDプレフィックス
      console.log(`  ${isNew ? '🆕 NEW' : '⭐ OLD'}: ${m.id} - ${m.title}`);
    });
    if (items.length === 0) {
      console.log('  (なし)');
    }
    console.log('');
  });
}).catch(console.error);
