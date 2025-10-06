#!/usr/bin/env node
// 自動価格チェック・更新スクリプト
// GitHub ActionsまたはCronから実行可能
// 使用方法:
//   node scripts/auto-pricing-check.js --analyze (分析のみ)
//   node scripts/auto-pricing-check.js --auto-fix (自動修正)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://design-generator-puce.vercel.app';

const REPORT_DIR = path.join(process.cwd(), 'pricing-reports');
const THRESHOLD_LOW_MARGIN = 30; // 30%未満は低マージン
const THRESHOLD_LOSS_RISK = 0; // 0%未満は赤字リスク

/**
 * 全ショップの価格分析を実行
 */
async function analyzePricing() {
    console.log('📊 価格分析開始...\n');

    const shops = [
        { id: '24565480', name: 'Storefront' },
        { id: '24566474', name: 'Etsy' },
        { id: '24566516', name: 'eBay' }
    ];

    const results = {
        timestamp: new Date().toISOString(),
        shops: [],
        summary: {
            totalProducts: 0,
            properlyPriced: 0,
            lowMargin: 0,
            lossRisk: 0
        },
        problematicProducts: []
    };

    for (const shop of shops) {
        console.log(`🔍 ${shop.name} を分析中...`);

        try {
            // サンプル分析（最初の10商品）
            const response = await fetch(
                `${API_BASE}/api/printify-list-products?shopId=${shop.id}&page=1&limit=100`,
                { signal: AbortSignal.timeout(30000) }
            );

            if (!response.ok) {
                console.error(`❌ ${shop.name}: API エラー`);
                continue;
            }

            const data = await response.json();
            const products = data.data || [];

            let shopProperlyPriced = 0;
            let shopLowMargin = 0;
            let shopLossRisk = 0;

            for (const product of products) {
                const margin = calculateMargin(product);

                if (margin < THRESHOLD_LOSS_RISK) {
                    shopLossRisk++;
                    results.problematicProducts.push({
                        shopId: shop.id,
                        shopName: shop.name,
                        productId: product.id,
                        title: product.title,
                        margin: margin,
                        severity: 'loss_risk',
                        blueprintId: product.blueprint_id
                    });
                } else if (margin < THRESHOLD_LOW_MARGIN) {
                    shopLowMargin++;
                    results.problematicProducts.push({
                        shopId: shop.id,
                        shopName: shop.name,
                        productId: product.id,
                        title: product.title,
                        margin: margin,
                        severity: 'low_margin',
                        blueprintId: product.blueprint_id
                    });
                } else {
                    shopProperlyPriced++;
                }
            }

            const shopResult = {
                shopId: shop.id,
                shopName: shop.name,
                totalProducts: products.length,
                properlyPriced: shopProperlyPriced,
                lowMargin: shopLowMargin,
                lossRisk: shopLossRisk
            };

            results.shops.push(shopResult);
            results.summary.totalProducts += products.length;
            results.summary.properlyPriced += shopProperlyPriced;
            results.summary.lowMargin += shopLowMargin;
            results.summary.lossRisk += shopLossRisk;

            console.log(`✅ ${shop.name}: ${shopProperlyPriced}適正 / ${shopLowMargin}低マージン / ${shopLossRisk}赤字リスク\n`);

        } catch (error) {
            console.error(`❌ ${shop.name} エラー:`, error.message);
        }
    }

    // レポート保存
    if (!fs.existsSync(REPORT_DIR)) {
        fs.mkdirSync(REPORT_DIR, { recursive: true });
    }

    const reportPath = path.join(REPORT_DIR, `pricing-analysis-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    console.log(`\n📄 レポート保存: ${reportPath}\n`);

    return results;
}

/**
 * マージン計算（簡易版）
 */
function calculateMargin(product) {
    const blueprintCosts = {
        706: 1241, 1296: 3064, 6: 1167, 26: 1480, 36: 1195,
        145: 1192, 157: 1093, 80: 2089, 49: 2230, 77: 2847,
        5: 1233, 384: 2587, 903: 1636, 12: 1636, 380: 1233
    };

    const blueprintId = product.blueprint_id;
    const baseCost = blueprintCosts[blueprintId];

    if (!baseCost || !product.variants || product.variants.length === 0) {
        return 0;
    }

    const firstVariant = product.variants[0];
    const price = firstVariant.price;

    if (!price || price === 0) {
        return 0;
    }

    const margin = ((price - baseCost) / price) * 100;
    return Math.round(margin * 10) / 10;
}

/**
 * 問題のある商品を自動修正
 */
async function autoFixProblems(analysisResults, targetMargin = 38) {
    console.log('\n🔧 自動修正開始...\n');

    const problematicProducts = analysisResults.problematicProducts || [];
    const fixResults = {
        success: [],
        failed: []
    };

    for (const product of problematicProducts) {
        console.log(`🔧 修正中: ${product.title.substring(0, 40)}...`);

        try {
            const response = await fetch(
                `${API_BASE}/api/printify-update-single-product`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        shopId: product.shopId,
                        productId: product.productId,
                        targetMargin: targetMargin
                    }),
                    signal: AbortSignal.timeout(30000)
                }
            );

            if (response.ok) {
                console.log(`✅ 修正成功: ${product.title.substring(0, 40)}`);
                fixResults.success.push(product.productId);
            } else {
                console.log(`❌ 修正失敗: ${product.title.substring(0, 40)}`);
                fixResults.failed.push(product.productId);
            }

            // レート制限対策
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error(`❌ エラー: ${product.title.substring(0, 40)}`, error.message);
            fixResults.failed.push(product.productId);
        }
    }

    console.log(`\n✅ 修正完了: ${fixResults.success.length}成功 / ${fixResults.failed.length}失敗\n`);

    return fixResults;
}

/**
 * サマリー表示
 */
function displaySummary(results) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 価格分析サマリー');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`全体統計:`);
    console.log(`  全商品数: ${results.summary.totalProducts}`);
    console.log(`  適正価格: ${results.summary.properlyPriced} (${Math.round(results.summary.properlyPriced / results.summary.totalProducts * 100)}%)`);
    console.log(`  低マージン: ${results.summary.lowMargin}`);
    console.log(`  赤字リスク: ${results.summary.lossRisk}\n`);

    console.log('ショップ別:');
    for (const shop of results.shops) {
        console.log(`  ${shop.shopName}:`);
        console.log(`    適正: ${shop.properlyPriced} / 低マージン: ${shop.lowMargin} / 赤字: ${shop.lossRisk}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // アラート
    if (results.summary.lossRisk > 0) {
        console.log(`⚠️  警告: ${results.summary.lossRisk}商品に赤字リスクがあります！`);
    }
    if (results.summary.lowMargin > 10) {
        console.log(`⚠️  注意: ${results.summary.lowMargin}商品が低マージンです。`);
    }
}

/**
 * メイン実行
 */
async function main() {
    const args = process.argv.slice(2);
    const mode = args[0] || '--analyze';

    console.log('🚀 自動価格チェックシステム\n');

    // 分析実行
    const results = await analyzePricing();
    displaySummary(results);

    // 自動修正モードの場合
    if (mode === '--auto-fix') {
        if (results.summary.lossRisk > 0 || results.summary.lowMargin > 0) {
            console.log('\n🔧 問題商品の自動修正を開始します...');
            const fixResults = await autoFixProblems(results);

            // 修正後の再分析
            console.log('\n📊 修正後の再分析...');
            const reanalysis = await analyzePricing();
            displaySummary(reanalysis);
        } else {
            console.log('✅ 修正が必要な商品はありません。');
        }
    } else {
        console.log('💡 自動修正するには --auto-fix オプションを使用してください。');
    }

    console.log('\n✅ 完了！');
}

main().catch(error => {
    console.error('❌ 実行エラー:', error);
    process.exit(1);
});
