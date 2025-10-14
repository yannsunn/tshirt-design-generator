#!/usr/bin/env node
// Etsy商品選定ツール
// 市場リサーチに基づき、Storefront商品から最適な50商品を選定

// .envファイルを読み込み
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { STOREFRONT_SHOP_ID, TARGET_COUNT } = require('../config/product-selection-config');
const { getAllStorefrontProducts } = require('../services/product-fetcher');
const { selectTop50Products, saveSelectionReport } = require('../services/product-scorer');

async function main() {
    console.log('🎯 Etsy商品選定ツール\n');
    console.log(`目標: Storefront商品から最適な${TARGET_COUNT}商品を選定\n`);

    if (!process.env.PRINTIFY_API_KEY) {
        console.error('❌ PRINTIFY_API_KEY環境変数が設定されていません');
        process.exit(1);
    }

    // 全商品取得
    const allProducts = await getAllStorefrontProducts(STOREFRONT_SHOP_ID);

    if (allProducts.length === 0) {
        console.log('⚠️ 商品が見つかりませんでした');
        return;
    }

    // 50商品選定
    const selectedProducts = selectTop50Products(allProducts);

    // レポート保存
    const outputDir = path.join(__dirname, '..', 'product-selections');
    const { reportPath, idsPath } = saveSelectionReport(selectedProducts, allProducts, fs, path, outputDir);

    console.log('【選定商品サンプル（TOP 10）】');
    selectedProducts.slice(0, 10).forEach((p, i) => {
        console.log(`  ${i + 1}. [${p.score}点] ${p.title}`);
        if (p.matchedTheme) {
            console.log(`     テーマ: ${p.matchedTheme}`);
        }
    });

    console.log('\n' + '='.repeat(80));
    console.log('🎉 Etsy商品選定完了！');
    console.log(`📊 ${selectedProducts.length}商品を選定しました`);
    console.log('='.repeat(80));
}

main().catch(error => {
    console.error('❌ エラー:', error);
    process.exit(1);
});
