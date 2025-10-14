#!/usr/bin/env node
// インバウンド向け日本Tシャツ市場リサーチ
// Playwright MCPを使用してEtsy、Amazon、楽天などをリサーチ

const path = require('path');
const { RESEARCH_KEYWORDS, PLATFORMS } = require('../config/market-research-config');
const { generateMarketResearchReport, printReport } = require('../services/report-generator');
const { saveReport } = require('../services/file-utils');

async function main() {
    console.log('🔍 インバウンド向け日本Tシャツ市場リサーチ開始\n');

    console.log('📋 リサーチキーワード:');
    RESEARCH_KEYWORDS.slice(0, 5).forEach(kw => console.log(`  - ${kw}`));
    console.log(`  ... 他 ${RESEARCH_KEYWORDS.length - 5}件\n`);

    console.log('🌐 リサーチ対象プラットフォーム:');
    PLATFORMS.forEach(platform => {
        console.log(`  - ${platform.name}: ${platform.targetMarket}`);
    });

    console.log('\n⚙️ レポート生成中...');
    const report = generateMarketResearchReport();

    printReport(report);

    const outputDir = path.join(__dirname, '..', 'research-reports');
    const filepath = saveReport(report, outputDir, 'market-research-japan-tshirts');

    console.log('\n✅ 市場リサーチ完了！');
}

main().catch(error => {
    console.error('❌ エラー:', error);
    process.exit(1);
});
