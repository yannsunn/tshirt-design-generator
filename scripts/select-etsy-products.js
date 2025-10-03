#!/usr/bin/env node
// Etsy商品選定ツール
// 市場リサーチに基づき、Storefront商品から最適な50商品を選定

const fs = require('fs');
const path = require('path');

const STOREFRONT_SHOP_ID = '24565480';
const TARGET_COUNT = 50;

// 市場リサーチから得られた推奨テーマ
const RECOMMENDED_THEMES = [
    {
        keywords: ['fuji', 'mountain', 'mt', 'fujisan'],
        theme: '富士山 × ミニマリズム',
        priority: 1,
        targetCount: 12
    },
    {
        keywords: ['sakura', 'cherry', 'blossom', 'zen', 'meditation'],
        theme: '桜 × 禅',
        priority: 2,
        targetCount: 10
    },
    {
        keywords: ['ramen', 'noodle', 'food', 'sushi'],
        theme: 'ラーメン × ユーモア',
        priority: 3,
        targetCount: 8
    },
    {
        keywords: ['kanji', 'street', '漢字', 'character'],
        theme: '漢字 × ストリート',
        priority: 4,
        targetCount: 10
    },
    {
        keywords: ['wave', 'hokusai', 'art', 'ukiyoe', '浮世絵'],
        theme: '波 × アート',
        priority: 5,
        targetCount: 10
    }
];

// NGキーワード（著作権リスクなど）
const EXCLUDE_KEYWORDS = [
    'anime', 'manga', 'character', 'pokemon', 'naruto', 'goku',
    'copyright', 'trademark', 'licensed'
];

async function getAllStorefrontProducts() {
    try {
        console.log('📋 Storefront商品一覧を取得中...');

        const products = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await fetch(
                `https://api.printify.com/v1/shops/${STOREFRONT_SHOP_ID}/products.json?limit=100&page=${page}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`商品取得失敗: HTTP ${response.status}`);
            }

            const data = await response.json();
            const pageProducts = data.data || [];

            products.push(...pageProducts);

            console.log(`  📄 ページ${page}: ${pageProducts.length}商品取得`);

            hasMore = data.current_page < data.last_page;
            page++;

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`✅ 合計 ${products.length}商品を取得\n`);
        return products;

    } catch (error) {
        console.error('❌ 商品取得エラー:', error.message);
        return [];
    }
}

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

function saveSelectionReport(selectedProducts, allProducts) {
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

    const outputDir = path.join(__dirname, '..', 'product-selections');
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

async function main() {
    console.log('🎯 Etsy商品選定ツール\n');
    console.log(`目標: Storefront商品から最適な${TARGET_COUNT}商品を選定\n`);

    if (!process.env.PRINTIFY_API_KEY) {
        console.error('❌ PRINTIFY_API_KEY環境変数が設定されていません');
        process.exit(1);
    }

    // 全商品取得
    const allProducts = await getAllStorefrontProducts();

    if (allProducts.length === 0) {
        console.log('⚠️ 商品が見つかりませんでした');
        return;
    }

    // 50商品選定
    const selectedProducts = selectTop50Products(allProducts);

    // レポート保存
    const { reportPath, idsPath } = saveSelectionReport(selectedProducts, allProducts);

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
