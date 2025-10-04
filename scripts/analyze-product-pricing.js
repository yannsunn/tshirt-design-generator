#!/usr/bin/env node
// 商品価格分析ツール
// 各商品のBlueprint原価に基づき、適切な価格設定を分析・提案

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'https://design-generator-puce.vercel.app/api';

const SHOPS = [
    { id: '24565480', name: 'Storefront' },
    { id: '24566474', name: 'Etsy' },
    { id: '24566516', name: 'eBay' }
];

// Blueprint原価マッピング（api/printify-update-prices-batch.jsと同じ）
const blueprintCosts = {
    // Custom masters
    706: { baseCost: 1241, extraCost: { '2XL': 1367, '3XL': 1571, '4XL': 1766 }, name: 'Custom T-Shirt' },
    1296: { baseCost: 3064, extraCost: { '2XL': 3548, '3XL': 4181 }, name: 'Custom Sweatshirt' },

    // Standard Blueprints (実測値、2025年10月時点)
    6: { baseCost: 1167, extraCost: { '2XL': 1544, '3XL': 1636, '4XL': 1636, '5XL': 1636 }, name: 'Gildan 5000 T-Shirt' },
    26: { baseCost: 1480, extraCost: { '2XL': 1987, '3XL': 2414 }, name: 'Gildan 980 Lightweight Tee' },
    36: { baseCost: 1195, extraCost: { '2XL': 1557, '3XL': 1810, '4XL': 1802, '5XL': 1800 }, name: 'Gildan 2000 Ultra Cotton Tee' },
    145: { baseCost: 1192, extraCost: { '2XL': 1457, '3XL': 1743 }, name: 'Gildan 64000 Softstyle T-Shirt' },
    157: { baseCost: 1093, extraCost: {}, name: 'Gildan 5000B Kids Tee' },
    80: { baseCost: 2089, extraCost: {}, name: 'Gildan 2400 Long Sleeve Tee' },
    49: { baseCost: 2230, extraCost: {}, name: 'Gildan 18000 Sweatshirt' },
    77: { baseCost: 2847, extraCost: { '2XL': 3208, '3XL': 3615, '4XL': 3615, '5XL': 3615 }, name: 'Gildan 18500 Hoodie' },

    // Bella+Canvas
    5: { baseCost: 1233, extraCost: { '2XL': 1544, '3XL': 1636, '4XL': 1636 }, name: 'Bella+Canvas 3001 Unisex Jersey Short Sleeve Tee' },
    384: { baseCost: 2587, extraCost: { '2XL': 3193, '3XL': 3592 }, name: 'Bella+Canvas 3719 Unisex Fleece Pullover Hooded Sweatshirt' },

    // Comfort Colors
    903: { baseCost: 1636, extraCost: { '2XL': 2039, '3XL': 2131 }, name: 'Comfort Colors 1717 Garment-Dyed Heavyweight T-Shirt' },

    // Next Level
    12: { baseCost: 1636, extraCost: { '2XL': 2039 }, name: 'Next Level 6210 Unisex Tri-Blend T-Shirt' },

    // District
    380: { baseCost: 1233, extraCost: { '2XL': 1544, '3XL': 1636, '4XL': 1636 }, name: 'District DT6000 Very Important Tee' }
};

const TARGET_MARGIN = 38; // 38%マージン目標

// 最適価格計算（$X.99形式）
function calculateOptimalPrice(costCents, targetMargin = TARGET_MARGIN) {
    const costUsd = costCents / 100;
    const exactPriceUsd = costUsd / (1 - targetMargin / 100);
    const priceUsd = Math.ceil(exactPriceUsd) - 0.01;
    return Math.round(priceUsd * 100);
}

// Blueprint原価取得
function getBlueprintCost(blueprintId) {
    return blueprintCosts[blueprintId] || null;
}

async function getAllProducts(shopId) {
    try {
        console.log(`📋 商品取得中: Shop ${shopId}...`);

        const products = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await fetch(
                `${API_BASE_URL}/printify-list-products?shopId=${shopId}&page=${page}&limit=50`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            if (!response.ok) {
                throw new Error(`商品取得失敗: HTTP ${response.status}`);
            }

            const data = await response.json();
            const pageProducts = data.products || [];
            products.push(...pageProducts);

            hasMore = data.currentPage < data.lastPage;
            page++;

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`✅ ${products.length}商品を取得\n`);
        return products;

    } catch (error) {
        console.error('❌ 商品取得エラー:', error.message);
        return [];
    }
}

function analyzeProductPricing(product) {
    const blueprintId = product.blueprint_id;
    const blueprintData = getBlueprintCost(blueprintId);

    if (!blueprintData) {
        return {
            productId: product.id,
            title: product.title,
            blueprintId: blueprintId,
            status: 'unknown',
            reason: 'Blueprint原価データなし',
            variants: []
        };
    }

    const variantAnalysis = [];
    let hasLoss = false;
    let hasWarning = false;

    // 各バリアントを分析
    for (const variant of product.variants || []) {
        const currentPrice = variant.price; // cents
        const variantTitle = variant.title || 'Unknown';

        // サイズから原価を取得
        let variantCost = blueprintData.baseCost;

        // サイズ別追加コストをチェック
        for (const [size, cost] of Object.entries(blueprintData.extraCost || {})) {
            if (variantTitle.includes(size)) {
                variantCost = cost;
                break;
            }
        }

        // 最適価格計算
        const minPrice = calculateOptimalPrice(variantCost, TARGET_MARGIN);
        const priceDiff = currentPrice - minPrice;
        const marginPercent = ((currentPrice - variantCost) / currentPrice * 100).toFixed(1);

        let variantStatus = 'ok';
        if (currentPrice < variantCost) {
            variantStatus = 'loss';
            hasLoss = true;
        } else if (currentPrice < minPrice) {
            variantStatus = 'warning';
            hasWarning = true;
        }

        variantAnalysis.push({
            title: variantTitle,
            currentPrice: currentPrice,
            currentPriceUsd: (currentPrice / 100).toFixed(2),
            cost: variantCost,
            costUsd: (variantCost / 100).toFixed(2),
            minPrice: minPrice,
            minPriceUsd: (minPrice / 100).toFixed(2),
            priceDiff: priceDiff,
            priceDiffUsd: (priceDiff / 100).toFixed(2),
            marginPercent: marginPercent,
            status: variantStatus
        });
    }

    let productStatus = 'ok';
    if (hasLoss) productStatus = 'loss';
    else if (hasWarning) productStatus = 'warning';

    return {
        productId: product.id,
        title: product.title,
        blueprintId: blueprintId,
        blueprintName: blueprintData.name,
        status: productStatus,
        variants: variantAnalysis
    };
}

async function generatePricingReport(shopId, shopName) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 価格分析レポート: ${shopName} (Shop ${shopId})`);
    console.log(`${'='.repeat(80)}\n`);

    const products = await getAllProducts(shopId);

    if (products.length === 0) {
        console.log('⚠️ 商品が見つかりませんでした\n');
        return { products: [], summary: null };
    }

    const analysis = products.map(p => analyzeProductPricing(p));

    // サマリー統計
    const lossProducts = analysis.filter(a => a.status === 'loss');
    const warningProducts = analysis.filter(a => a.status === 'warning');
    const okProducts = analysis.filter(a => a.status === 'ok');
    const unknownProducts = analysis.filter(a => a.status === 'unknown');

    console.log('【価格設定サマリー】');
    console.log(`  ❌ 赤字リスク: ${lossProducts.length}商品`);
    console.log(`  ⚠️  低マージン: ${warningProducts.length}商品`);
    console.log(`  ✅ 適正価格: ${okProducts.length}商品`);
    console.log(`  ❓ 不明: ${unknownProducts.length}商品\n`);

    // 赤字リスク商品を表示
    if (lossProducts.length > 0) {
        console.log('【❌ 赤字リスク商品】');
        lossProducts.forEach(product => {
            console.log(`\n  商品: ${product.title}`);
            console.log(`  ID: ${product.productId}`);
            console.log(`  Blueprint: ${product.blueprintName || product.blueprintId}`);

            const lossVariants = product.variants.filter(v => v.status === 'loss');
            lossVariants.forEach(v => {
                console.log(`    ❌ ${v.title}`);
                console.log(`       現在価格: $${v.currentPriceUsd} | 原価: $${v.costUsd} | 損失: $${Math.abs(parseFloat(v.priceDiffUsd)).toFixed(2)}`);
                console.log(`       推奨価格: $${v.minPriceUsd} (${TARGET_MARGIN}%マージン)`);
            });
        });
        console.log();
    }

    // 低マージン商品を表示
    if (warningProducts.length > 0) {
        console.log('【⚠️  低マージン商品（マージン < 38%）】');
        warningProducts.slice(0, 10).forEach(product => {
            console.log(`\n  商品: ${product.title}`);
            console.log(`  ID: ${product.productId}`);
            console.log(`  Blueprint: ${product.blueprintName || product.blueprintId}`);

            const warningVariants = product.variants.filter(v => v.status === 'warning');
            warningVariants.slice(0, 3).forEach(v => {
                console.log(`    ⚠️  ${v.title}`);
                console.log(`       現在価格: $${v.currentPriceUsd} | 原価: $${v.costUsd} | マージン: ${v.marginPercent}%`);
                console.log(`       推奨価格: $${v.minPriceUsd} (差額: $${v.priceDiffUsd})`);
            });
        });
        if (warningProducts.length > 10) {
            console.log(`\n  ... 他 ${warningProducts.length - 10}商品`);
        }
        console.log();
    }

    const summary = {
        totalProducts: products.length,
        lossProducts: lossProducts.length,
        warningProducts: warningProducts.length,
        okProducts: okProducts.length,
        unknownProducts: unknownProducts.length
    };

    return { products: analysis, summary };
}

async function main() {
    console.log('💰 商品価格分析ツール\n');
    console.log(`目標マージン: ${TARGET_MARGIN}%\n`);

    const allReports = {};

    for (const shop of SHOPS) {
        const report = await generatePricingReport(shop.id, shop.name);
        allReports[shop.name] = report;

        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // レポートをJSON保存
    const outputDir = path.join(__dirname, '..', 'pricing-reports');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `pricing-analysis-${Date.now()}.json`;
    const filepath = path.join(outputDir, filename);

    const reportData = {
        generatedAt: new Date().toISOString(),
        targetMargin: TARGET_MARGIN,
        shops: allReports
    };

    fs.writeFileSync(filepath, JSON.stringify(reportData, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('📄 価格分析レポート保存完了');
    console.log(`📁 ${filepath}`);
    console.log('='.repeat(80));

    // 全体サマリー
    console.log('\n【全ショップ統合サマリー】');
    let totalLoss = 0, totalWarning = 0, totalOk = 0, totalUnknown = 0;
    for (const [shopName, report] of Object.entries(allReports)) {
        if (report.summary) {
            totalLoss += report.summary.lossProducts;
            totalWarning += report.summary.warningProducts;
            totalOk += report.summary.okProducts;
            totalUnknown += report.summary.unknownProducts;

            console.log(`\n  ${shopName}:`);
            console.log(`    赤字リスク: ${report.summary.lossProducts}商品`);
            console.log(`    低マージン: ${report.summary.warningProducts}商品`);
            console.log(`    適正価格: ${report.summary.okProducts}商品`);
        }
    }

    console.log(`\n  合計:`);
    console.log(`    赤字リスク: ${totalLoss}商品`);
    console.log(`    低マージン: ${totalWarning}商品`);
    console.log(`    適正価格: ${totalOk}商品`);
    console.log(`    不明: ${totalUnknown}商品`);

    if (totalLoss > 0 || totalWarning > 0) {
        console.log(`\n  ⚠️  ${totalLoss + totalWarning}商品の価格調整を推奨します`);
    } else {
        console.log('\n  ✅ 全商品が適正価格で設定されています');
    }
}

main().catch(error => {
    console.error('❌ エラー:', error);
    process.exit(1);
});
