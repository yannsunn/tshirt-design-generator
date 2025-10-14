// ファイル操作ユーティリティ
const fs = require('fs');
const path = require('path');

function saveReport(report, outputDir, filenamePrefix) {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `${filenamePrefix}-${Date.now()}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`\n📄 レポート保存: ${filepath}`);

    return filepath;
}

module.exports = {
    saveReport
};
