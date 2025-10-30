import dotenv from 'dotenv';
dotenv.config();

const token = process.env.PRINTIFY_API_KEY;

async function listShops() {
  console.log('📦 Printify接続ショップ一覧:\n');

  const response = await fetch('https://api.printify.com/v1/shops.json', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const shops = await response.json();

  shops.forEach(s => {
    console.log('Shop ID:', s.id);
    console.log('  Title:', s.title);
    console.log('  Sales Channel:', s.sales_channel);
    console.log('  Connected:', s.is_connected ? '✅' : '❌');
    console.log('');
  });
}

listShops();
