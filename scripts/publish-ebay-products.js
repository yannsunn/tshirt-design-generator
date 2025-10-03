#!/usr/bin/env node
// eBay商品を自動公開
// 1. 全商品IDを取得
// 2. 未公開商品を公開

// .envファイルを読み込み
require('dotenv').config();

const API_BASE_URL = 'https://design-generator-puce.vercel.app/api';
const EBAY_SHOP_ID = '24566516';
const BATCH_SIZE = 10; // 一度に公開する商品数

async function getAllProducts(shopId) {
    try {
        console.log(`📋 [eBay] 商品一覧を取得中...`);

        const products = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await fetch(
                `https://design-generator-puce.vercel.app/api/printify-list-products?shopId=${shopId}&page=${page}&limit=50`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`商品取得失敗: HTTP ${response.status}`);
            }

            const data = await response.json();
            const pageProducts = data.products || [];

            products.push(...pageProducts);

            console.log(`  📄 ページ${page}: ${pageProducts.length}商品取得`);

            hasMore = data.currentPage < data.lastPage;
            page++;

            // レート制限対策
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`✅ 合計 ${products.length}商品を取得しました\n`);
        return products;

    } catch (error) {
        console.error('❌ 商品取得エラー:', error.message);
        return [];
    }
}

async function publishProducts(shopId, productIds) {
    try {
        console.log(`\n📤 [eBay] ${productIds.length}商品を公開中...`);

        const response = await fetch(`${API_BASE_URL}/printify-publish-products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shopId: shopId,
                productIds: productIds
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        return result;

    } catch (error) {
        console.error('❌ 公開エラー:', error.message);
        return null;
    }
}

async function main() {
    console.log('🚀 eBay商品自動公開ツール\n');

    // 環境変数チェック
    if (!process.env.PRINTIFY_API_KEY) {
        console.error('❌ PRINTIFY_API_KEY環境変数が設定されていません');
        process.exit(1);
    }

    // 全商品を取得
    const allProducts = await getAllProducts(EBAY_SHOP_ID);

    if (allProducts.length === 0) {
        console.log('⚠️ 商品が見つかりませんでした');
        return;
    }

    // 未公開商品のみをフィルター
    const unpublishedProducts = allProducts.filter(p => !p.is_published);

    console.log(`📊 商品統計:`);
    console.log(`  - 全商品: ${allProducts.length}件`);
    console.log(`  - 公開済み: ${allProducts.length - unpublishedProducts.length}件`);
    console.log(`  - 未公開: ${unpublishedProducts.length}件\n`);

    if (unpublishedProducts.length === 0) {
        console.log('✅ 全ての商品が既に公開されています');
        return;
    }

    // バッチで公開
    let publishedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < unpublishedProducts.length; i += BATCH_SIZE) {
        const batch = unpublishedProducts.slice(i, i + BATCH_SIZE);
        const productIds = batch.map(p => p.id);

        console.log(`\n📦 バッチ ${Math.floor(i / BATCH_SIZE) + 1}: ${productIds.length}商品`);

        const result = await publishProducts(EBAY_SHOP_ID, productIds);

        if (result) {
            publishedCount += result.published || 0;
            errorCount += result.errors || 0;

            console.log(`  ✅ 公開: ${result.published}件`);
            console.log(`  ❌ エラー: ${result.errors}件`);

            // 詳細結果
            if (result.results) {
                result.results.forEach(r => {
                    if (r.published) {
                        console.log(`    ✅ ${r.title}`);
                    } else {
                        console.log(`    ❌ ${r.title}: ${r.error}`);
                    }
                });
            }
        }

        // レート制限対策（次のバッチまで3秒待機）
        if (i + BATCH_SIZE < unpublishedProducts.length) {
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 eBay商品公開完了！');
    console.log(`📊 結果: 公開${publishedCount}件、エラー${errorCount}件`);
    console.log('='.repeat(60));
}

main().catch(error => {
    console.error('❌ 致命的エラー:', error);
    process.exit(1);
});
