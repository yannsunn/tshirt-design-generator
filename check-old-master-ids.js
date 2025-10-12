const https = require('https');

// 削除前のマスターID（コードから取得）
const oldMasterIds = {
  tshirt: '68dffaef951b5797930ad3fa',
  lightweight_tee: '68dffca5f6f3f5439609a446',
  ultra_cotton_tee: '68e00767f405aeee2807feaa',
  softstyle_tee: '68dffe1ff1fe6779bb0cdfb1',
  kids_tee: '68dfff12ccd7b22ae206682a',
  longsleeve: '68e0000eb4d1554d3906a4bc',
  sweatshirt: '68e0050d0515f444220525d7',
  hoodie: '68e006307bbf5c83180c5b45'
};

const apiKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6IjcwNmZkYTU1MjFiYWRkNGZhYWI2YmM1NWNlNGE3NzNhOTYyZGQ0MWNlZWIwYzczYmU1YmM3OTEyMDcwZTI2MTIyOGQ3Y2YyZGQ2YmEwMjBhIiwiaWF0IjoxNzU5MDg4ODEyLjQ2NzQ0MywibmJmIjoxNzU5MDg4ODEyLjQ2NzQ0NiwiZXhwIjoxNzkwNjI0ODEyLjQ1NzU2Miwic3ViIjoiMjQ4MjUxNzkiLCJzY29wZXMiOlsic2hvcHMubWFuYWdlIiwic2hvcHMucmVhZCIsImNhdGFsb2cucmVhZCIsIm9yZGVycy5yZWFkIiwib3JkZXJzLndyaXRlIiwicHJvZHVjdHMucmVhZCIsInByb2R1Y3RzLndyaXRlIiwid2ViaG9va3MucmVhZCIsIndlYmhvb2tzLndyaXRlIiwidXBsb2Fkcy5yZWFkIiwidXBsb2Fkcy53cml0ZSIsInByaW50X3Byb3ZpZGVycy5yZWFkIiwidXNlci5pbmZvIl19.Nkw1URM6xOcgTJXkZbC0-KwJP86k2CgfRw5ZSAu-vtoWLLIfjwPmTWBoWKqu2oq_Ntvpxe_Y9_rmWh-UELL4FuAMUJ-Ocb6_hpbpOoQ7U0b7A3AyEsPyAUOq8E78upyzR0rX5ucvUt7XLd3NHy7VRoER47q5NFKl_GgOmb5k-X27iKRr5mjW6fyHIvey0QWJsSuMQ3TzlbrUO5czYu7HLox_Tt1YFUFkNMXj2pmPIGVDhwbE2QZBmj0oWM5SKLz-ztAwBBefJgo_Sd8A5g6f7crt_Y1awcrabfdPxyEEn_4nIqKyCVAgwXFIePhmPK48_SMO_HzcnA9ikxdNm9Z3Up2-3xGFazwvyWJXGYBCrZSFaFNoRsIFA3n3tn3no9sJhp2v7NQHGmLepiKe_yIj-Xw6IX1_1JWu5kRfyimwMGjRNA1wtfitto8oa5iVaeDausesQheHPR4SdJqmzmuSuWqQDlqks3Tmjsp2887N3ZYKCRvSv21ouJLWBkx1f_Fqmn9mAuyFP7FIzMElzIDBmFRZ6Ae6Sg4FTBnvuzkoav2E3QnpMj02y7NeMKeI7uJ8_6rVKYwmcha0Xzoq16SPceaTaVxBU-pO96iEBNwHbw9k7Ovay_TQq8iD8TNlv8ArwyZCprw6H98zbHTlRrq1EAhtCuPY98-c9xqGd0XXODw';

async function checkProduct(type, id) {
  return new Promise((resolve) => {
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
          const json = JSON.parse(data);
          resolve({ type, id, exists: true, title: json.title, blueprint: json.blueprint_id });
        } else {
          resolve({ type, id, exists: false });
        }
      });
    });

    req.on('error', () => resolve({ type, id, exists: false }));
    req.end();
  });
}

async function checkAll() {
  console.log('\n=== 削除前のマスターID確認 ===\n');

  const checks = Object.entries(oldMasterIds).map(([type, id]) =>
    checkProduct(type, id)
  );

  const results = await Promise.all(checks);

  let foundCount = 0;
  results.forEach(r => {
    if (r.exists) {
      console.log(`✅ ${r.type}: ${r.id}`);
      console.log(`   Title: ${r.title}`);
      console.log(`   Blueprint: ${r.blueprint}`);
      foundCount++;
    } else {
      console.log(`❌ ${r.type}: ${r.id} - 削除済み`);
    }
  });

  console.log(`\n合計: ${foundCount}/8 個のマスターが残っています`);
}

checkAll();
