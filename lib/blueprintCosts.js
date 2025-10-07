// Blueprint原価データ（全APIで共通使用）
// セント単位のUSD（例: 1167 = $11.67）

export const blueprintCosts = {
    // ユーザーカスタムマスター商品（優先）
    706: {
        baseCost: 1241,
        extraCost: { '2XL': 1367, '3XL': 1571, '4XL': 1766 },
        name: 'Custom T-Shirt (Master)'
    },
    1296: {
        baseCost: 3064,
        extraCost: { '2XL': 3548, '3XL': 4181 },
        name: 'Custom Sweatshirt (Master)'
    },

    // 標準Blueprints（Gildan）
    6: {
        baseCost: 1167,
        extraCost: { '2XL': 1544, '3XL': 1636, '4XL': 1636, '5XL': 1636 },
        name: 'Gildan 5000 T-Shirt'
    },
    26: {
        baseCost: 1029,
        extraCost: { '2XL': 1406, '3XL': 1498 },
        name: 'Gildan 980 Lightweight Tee'
    },
    36: {
        baseCost: 1231,
        extraCost: { '2XL': 1608, '3XL': 1700 },
        name: 'Gildan 2000 Ultra Cotton Tee'
    },
    145: {
        baseCost: 1096,
        extraCost: { '2XL': 1473, '3XL': 1565 },
        name: 'Gildan 64000 Softstyle T-Shirt'
    },
    157: {
        baseCost: 1071,
        extraCost: {},
        name: 'Gildan 5000B Kids Tee'
    },
    80: {
        baseCost: 1398,
        extraCost: { '2XL': 1775, '3XL': 1867 },
        name: 'Gildan 2400 Long Sleeve Tee'
    },
    49: {
        baseCost: 2230,
        extraCost: { '2XL': 2680, '3XL': 3130 },
        name: 'Gildan 18000 Sweatshirt'
    },
    77: {
        baseCost: 2700,
        extraCost: { '2XL': 3150, '3XL': 3600 },
        name: 'Gildan 18500 Hoodie'
    },

    // Bella+Canvas
    5: {
        baseCost: 1233,
        extraCost: { '2XL': 1544, '3XL': 1636, '4XL': 1636 },
        name: 'Bella+Canvas 3001 Unisex Jersey Short Sleeve Tee'
    },
    384: {
        baseCost: 2587,
        extraCost: { '2XL': 3193, '3XL': 3592 },
        name: 'Bella+Canvas 3719 Unisex Fleece Pullover Hooded Sweatshirt'
    },

    // Comfort Colors
    903: {
        baseCost: 1636,
        extraCost: { '2XL': 2039, '3XL': 2131 },
        name: 'Comfort Colors 1717 Garment-Dyed Heavyweight T-Shirt'
    },

    // Next Level
    12: {
        baseCost: 1636,
        extraCost: { '2XL': 2039 },
        name: 'Next Level 6210 Unisex Tri-Blend T-Shirt'
    }
};

// USD $X.99 価格計算関数（38%前後の利益率）
export function calculateOptimalPrice(costCents, targetMargin = 38) {
    // セント→ドル変換
    const costUsd = costCents / 100;
    // 目標価格を計算
    const exactPriceUsd = costUsd / (1 - targetMargin / 100);
    // 次の$X.99に切り上げ
    const priceUsd = Math.ceil(exactPriceUsd) - 0.01;
    // Printify APIはセント単位（整数）で価格を受け取る
    return Math.round(priceUsd * 100);
}

// バリアント価格を計算（サイズ別）
export function calculateVariantPrice(blueprintId, variantTitle, targetMargin = 38) {
    const costInfo = blueprintCosts[blueprintId];
    if (!costInfo) {
        return null;
    }

    let cost = costInfo.baseCost;

    // サイズを検出
    if (variantTitle.includes('5XL')) {
        cost = costInfo.extraCost['5XL'] || costInfo.baseCost * 1.5;
    } else if (variantTitle.includes('4XL')) {
        cost = costInfo.extraCost['4XL'] || costInfo.baseCost * 1.4;
    } else if (variantTitle.includes('3XL')) {
        cost = costInfo.extraCost['3XL'] || costInfo.baseCost * 1.33;
    } else if (variantTitle.includes('2XL')) {
        cost = costInfo.extraCost['2XL'] || costInfo.baseCost * 1.25;
    }

    return calculateOptimalPrice(cost, targetMargin);
}
