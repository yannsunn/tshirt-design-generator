// Etsy Shop IDを取得するスクリプト
// 使い方: node scripts/get-etsy-shop-id.js

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .envファイルを読み込み
dotenv.config({ path: resolve(__dirname, '../.env') });

const ETSY_API_KEY = process.env.ETSY_API_KEY;

if (!ETSY_API_KEY) {
    console.error('❌ ETSY_API_KEY が設定されていません');
    console.error('   .env ファイルに ETSY_API_KEY を追加してください');
    process.exit(1);
}

console.log('📋 Etsy Shop ID取得スクリプト');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('⚠️  このスクリプトを実行するには、まずOAuth認証が必要です。');
console.log('');
console.log('📝 手動で確認する方法:');
console.log('');
console.log('1. Etsyショップ管理画面にアクセス:');
console.log('   https://www.etsy.com/your/shops/me/tools/listings');
console.log('');
console.log('2. ページのソースコードを表示 (右クリック → "ページのソースを表示")');
console.log('');
console.log('3. "shop_id" または "shopId" で検索');
console.log('');
console.log('4. 見つかった数値があなたのShop IDです');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('💡 または、Printify Etsy Shopの設定ページで確認:');
console.log('   https://printify.com/app/stores');
console.log('');
console.log('   "My Etsy Store" の詳細にShop IDが表示されています');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Printify APIでEtsy Shop IDを取得する方法
async function getShopIdFromPrintify() {
    const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY;

    if (!PRINTIFY_API_KEY) {
        console.error('❌ PRINTIFY_API_KEY が設定されていません');
        return null;
    }

    try {
        console.log('\n🔍 Printify APIからEtsy Shop情報を取得中...\n');

        const response = await fetch('https://api.printify.com/v1/shops.json', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${PRINTIFY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Printify API error: ${response.status}`);
        }

        const shops = await response.json();

        // Etsyショップを探す
        const etsyShop = shops.find(shop =>
            shop.title.toLowerCase().includes('etsy') ||
            shop.type === 'etsy'
        );

        if (etsyShop) {
            console.log('✅ Printify経由でEtsy Shop情報を取得しました:');
            console.log('');
            console.log(`📋 Shop Name: ${etsyShop.title}`);
            console.log(`🆔 Shop ID: ${etsyShop.id}`);
            console.log('');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('');
            console.log('📝 .env ファイルに追加してください:');
            console.log('');
            console.log(`ETSY_SHOP_ID=${etsyShop.id}`);
            console.log('');
            console.log('そして、Vercel環境変数にも追加:');
            console.log('');
            console.log(`echo "${etsyShop.id}" | vercel env add ETSY_SHOP_ID production`);
            console.log('');

            return etsyShop.id;
        } else {
            console.log('⚠️  Printify経由ではEtsyショップが見つかりませんでした');
            console.log('   上記の手動確認方法をお試しください');
            return null;
        }

    } catch (error) {
        console.error('❌ Printify API エラー:', error.message);
        return null;
    }
}

// 実行
getShopIdFromPrintify();
