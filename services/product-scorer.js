// 商品スコアリングサービス
const { RECOMMENDED_THEMES, EXCLUDE_KEYWORDS, TARGET_COUNT } = require('../config/product-selection-config');

function scoreProduct(product) {
    const title = (product.title || '').toLowerCase();
    const description = (product.description || '').toLowerCase();
    const tags = (product.tags || []).join(' ').toLowerCase();
    const fullText = `${title} ${description} ${tags}`;

    let score = 0;
    let matchedTheme = null;
    let excludeReason = null;

    // NGキーワードチェック
    for (const keyword of EXCLUDE_KEYWORDS) {
        if (fullText.includes(keyword.toLowerCase())) {
            excludeReason = `NGキーワード: ${keyword}`;
            return { score: -1, matchedTheme: null, excludeReason };
        }
    }

    // テーママッチング
    for (const theme of RECOMMENDED_THEMES) {
        let themeScore = 0;
        let matchCount = 0;

        for (const keyword of theme.keywords) {
            if (fullText.includes(keyword.toLowerCase())) {
                matchCount++;
                themeScore += 10;
            }
        }

        // タイトルに含まれる場合はボーナス
        if (theme.keywords.some(kw => title.includes(kw.toLowerCase()))) {
            themeScore += 5;
        }

        if (themeScore > score) {
            score = themeScore;
            matchedTheme = theme.theme;
        }
    }

    // 日本関連キーワードボーナス
    const japanKeywords = ['japan', 'japanese', 'tokyo', 'kyoto', 'nihon', 'nippon'];
    if (japanKeywords.some(kw => fullText.includes(kw))) {
        score += 3;
    }

    // 公開済み商品にボーナス
    if (product.is_published) {
        score += 2;
    }

    // 画像がある商品にボーナス
    if (product.images && product.images.length > 0) {
        score += 1;
    }

    return { score, matchedTheme, excludeReason };
}

function selectTop50Products(products) {
    console.log('🔍 商品スコアリング中...\n');

    const scoredProducts = products.map(product => {
        const { score, matchedTheme, excludeReason } = scoreProduct(product);
        return {
            ...product,
            score,
            matchedTheme,
            excludeReason
        };
    });

    // 除外商品を削除
    const validProducts = scoredProducts.filter(p => p.score >= 0);

    console.log(`  有効商品: ${validProducts.length}件`);
    console.log(`  除外商品: ${scoredProducts.length - validProducts.length}件\n`);

    // スコア順にソート
    validProducts.sort((a, b) => b.score - a.score);

    // テーマごとの配分を考慮して選定
    const selectedProducts = [];
    const themeCount = {};

    // 優先度が高いテーマから選定
    for (const theme of RECOMMENDED_THEMES) {
        const themeProducts = validProducts.filter(p =>
            p.matchedTheme === theme.theme && !selectedProducts.includes(p)
        );

        const selectCount = Math.min(theme.targetCount, themeProducts.length);
        selectedProducts.push(...themeProducts.slice(0, selectCount));
        themeCount[theme.theme] = selectCount;
    }

    // 残りはスコアが高い順に選定
    const remaining = TARGET_COUNT - selectedProducts.length;
    if (remaining > 0) {
        const unselected = validProducts.filter(p => !selectedProducts.includes(p));
        selectedProducts.push(...unselected.slice(0, remaining));
    }

    // 最大50商品に制限
    const finalSelection = selectedProducts.slice(0, TARGET_COUNT);

    console.log('【テーマ別選定結果】');
    for (const theme of RECOMMENDED_THEMES) {
        const count = themeCount[theme.theme] || 0;
        console.log(`  ${theme.theme}: ${count}商品 (目標: ${theme.targetCount})`);
    }

    const unthemed = finalSelection.filter(p => !p.matchedTheme).length;
    if (unthemed > 0) {
        console.log(`  その他: ${unthemed}商品`);
    }

    console.log(`\n✅ 合計 ${finalSelection.length}商品を選定\n`);

    return finalSelection;
}

function saveSelectionReport(selectedProducts, allProducts, fs, path, outputDir) {
    const report = {
        generatedAt: new Date().toISOString(),
        totalProductsAnalyzed: allProducts.length,
        selectedCount: selectedProducts.length,
        targetCount: TARGET_COUNT,

        selectionCriteria: {
            themes: RECOMMENDED_THEMES.map(t => ({
                theme: t.theme,
                keywords: t.keywords,
                targetCount: t.targetCount
            })),
            excludeKeywords: EXCLUDE_KEYWORDS
        },

        selectedProducts: selectedProducts.map(p => ({
            id: p.id,
            title: p.title,
            score: p.score,
            matchedTheme: p.matchedTheme,
            tags: p.tags,
            isPublished: p.is_published
        })),

        themeBreakdown: RECOMMENDED_THEMES.reduce((acc, theme) => {
            acc[theme.theme] = selectedProducts.filter(p => p.matchedTheme === theme.theme).length;
            return acc;
        }, {}),

        recommendations: [
            '1. 選定商品をEtsyショップに転送',
            '2. 各商品の価格を$28-$35に設定',
            '3. SEOキーワードを商品説明に追加',
            '4. ストーリー性のある説明文を作成',
            '5. 高品質な商品画像を確認',
            '6. 2週間後に販売実績を分析'
        ]
    };

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `etsy-selection-${Date.now()}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`📄 選定レポート保存: ${filepath}\n`);

    // 商品IDリストも保存
    const idsFilename = `etsy-product-ids-${Date.now()}.txt`;
    const idsFilepath = path.join(outputDir, idsFilename);
    fs.writeFileSync(idsFilepath, selectedProducts.map(p => p.id).join('\n'));
    console.log(`📄 商品IDリスト保存: ${idsFilepath}\n`);

    return { reportPath: filepath, idsPath: idsFilepath };
}

module.exports = {
    scoreProduct,
    selectTop50Products,
    saveSelectionReport
};
