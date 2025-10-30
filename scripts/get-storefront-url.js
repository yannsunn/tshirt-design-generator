/**
 * Printify Storefront URL取得
 */

import 'dotenv/config';

const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY;
const STOREFRONT_SHOP_ID = '24565480';

async function getStorefrontURL() {
  try {
    const response = await fetch(
      `https://api.printify.com/v1/shops/${STOREFRONT_SHOP_ID}.json`,
      {
        headers: {
          'Authorization': `Bearer ${PRINTIFY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const shop = await response.json();

    console.log('📦 Printify Storefront情報:');
    console.log('');
    console.log(`Shop名: ${shop.title}`);
    console.log(`Shop ID: ${shop.id}`);

    // StorefrontのURLを生成（通常はshop titleから）
    const storefrontSlug = shop.title.toLowerCase().replace(/\s+/g, '');
    const storefrontURL = `https://${storefrontSlug}.printify.me`;

    console.log(`Storefront URL: ${storefrontURL}`);
    console.log('');
    console.log('⚠️ 注意: 実際のURLはPrintifyダッシュボードで確認してください');
    console.log('   Settings → Storefront → Your store URL');

  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

getStorefrontURL();
