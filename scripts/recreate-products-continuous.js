#!/usr/bin/env node
// 既存商品をマスターベースで再作成（継続実行）
// 9秒に1回、5商品ずつ処理してタイムアウトを回避

const API_BASE_URL = 'https://design-generator-puce.vercel.app/api';
const BATCH_SIZE = 5;
const INTERVAL_MS = 9000; // 9秒

// ショップ設定
const SHOPS = [
    { id: '24565480', name: 'Storefront' },
    { id: '24566474', name: 'Etsy' },
    { id: '24566516', name: 'eBay' }
];

let currentShopIndex = 0;
let currentOffset = 0;
let totalRecreated = 0;
let totalSkipped = 0;
let totalErrors = 0;

async function recreateBatch(shopId, shopName, offset, deleteOld = false) {
    try {
        console.log(`\n🔄 [${shopName}] バッチ処理開始 (Offset: ${offset})`);

        const response = await fetch(`${API_BASE_URL}/recreate-from-masters-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shopId: shopId,
                offset: offset,
                limit: BATCH_SIZE,
                deleteOld: deleteOld
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        const result = await response.json();

        console.log(`✅ [${shopName}] 再作成: ${result.recreated}件、スキップ: ${result.skipped}件、エラー: ${result.errors}件`);

        return result;

    } catch (error) {
        console.error(`❌ [${shopName}] エラー:`, error.message);
        return null;
    }
}

async function processNextBatch() {
    const shop = SHOPS[currentShopIndex];

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 処理中のショップ: ${shop.name} (${currentShopIndex + 1}/${SHOPS.length})`);
    console.log(`📍 現在のOffset: ${currentOffset}`);
    console.log(`📈 累計: 再作成${totalRecreated}件、スキップ${totalSkipped}件、エラー${totalErrors}件`);
    console.log(`${'='.repeat(60)}`);

    const result = await recreateBatch(shop.id, shop.name, currentOffset, false);

    if (result) {
        totalRecreated += result.recreated;
        totalSkipped += result.skipped;
        totalErrors += result.errors;

        // 詳細結果をログ出力
        if (result.results && result.results.length > 0) {
            result.results.forEach(r => {
                if (r.status === 'success') {
                    console.log(`  ✅ ${r.title}: ${r.oldProductId} → ${r.newProductId}`);
                } else if (r.status === 'skipped') {
                    console.log(`  ⏭️ ${r.title}: ${r.reason}`);
                } else if (r.status === 'error') {
                    console.error(`  ❌ ${r.title}: ${r.error}`);
                }
            });
        }

        // 次のバッチに進む
        if (result.hasMore) {
            currentOffset = result.nextOffset;
        } else {
            // 現在のショップが完了したら次のショップへ
            console.log(`\n🎉 [${shop.name}] 全商品処理完了！`);
            currentShopIndex++;
            currentOffset = 0;

            if (currentShopIndex >= SHOPS.length) {
                console.log('\n' + '='.repeat(60));
                console.log('🎊 全ショップの処理が完了しました！');
                console.log(`📊 最終結果: 再作成${totalRecreated}件、スキップ${totalSkipped}件、エラー${totalErrors}件`);
                console.log('='.repeat(60));
                process.exit(0);
            }
        }
    } else {
        // エラーが発生した場合は次のバッチに進む
        currentOffset += BATCH_SIZE;
    }
}

async function main() {
    console.log('🚀 マスターベース商品再作成 - 継続実行モード');
    console.log(`⏱️ インターバル: ${INTERVAL_MS / 1000}秒`);
    console.log(`📦 バッチサイズ: ${BATCH_SIZE}商品`);
    console.log(`🏪 対象ショップ: ${SHOPS.map(s => s.name).join(', ')}`);
    console.log(`🗑️ 古い商品削除: 無効（安全のため）\n`);

    // 最初のバッチを即実行
    await processNextBatch();

    // 9秒ごとに次のバッチを実行
    setInterval(async () => {
        await processNextBatch();
    }, INTERVAL_MS);
}

// Ctrl+Cで終了時の処理
process.on('SIGINT', () => {
    console.log('\n\n⏹️ 処理を中断しました');
    console.log(`📊 最終結果: 再作成${totalRecreated}件、スキップ${totalSkipped}件、エラー${totalErrors}件`);
    process.exit(0);
});

main().catch(error => {
    console.error('❌ 致命的エラー:', error);
    process.exit(1);
});
