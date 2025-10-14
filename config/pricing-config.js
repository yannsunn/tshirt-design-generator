// 価格設定ファイル
// Blueprint原価とデフォルト設定を一元管理

// Blueprint IDごとの原価マッピング (実際のPrintify原価、セント単位)
// 2025年10月時点の実測値
const BLUEPRINT_COSTS = {
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

    // 標準Blueprint - Gildan
    6: {
        baseCost: 1167,
        extraCost: { '2XL': 1544, '3XL': 1636, '4XL': 1636, '5XL': 1636 },
        name: 'Gildan 5000 T-Shirt'
    },
    26: {
        baseCost: 1480,
        extraCost: { '2XL': 1987, '3XL': 2414 },
        name: 'Gildan 980 Lightweight Tee'
    },
    36: {
        baseCost: 1195,
        extraCost: { '2XL': 1557, '3XL': 1810, '4XL': 1802, '5XL': 1800 },
        name: 'Gildan 2000 Ultra Cotton Tee'
    },
    145: {
        baseCost: 1192,
        extraCost: { '2XL': 1457, '3XL': 1743 },
        name: 'Gildan 64000 Softstyle T-Shirt'
    },
    157: {
        baseCost: 1093,
        extraCost: {},
        name: 'Gildan 5000B Kids Tee'
    },
    80: {
        baseCost: 2089,
        extraCost: {},
        name: 'Gildan 2400 Long Sleeve Tee'
    },
    49: {
        baseCost: 2230,
        extraCost: {},
        name: 'Gildan 18000 Sweatshirt'
    },
    77: {
        baseCost: 2847,
        extraCost: { '2XL': 3208, '3XL': 3615, '4XL': 3615, '5XL': 3615 },
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
    },

    // District
    380: {
        baseCost: 1233,
        extraCost: { '2XL': 1544, '3XL': 1636, '4XL': 1636 },
        name: 'District DT6000 Very Important Tee'
    }
};

// デフォルト設定
const PRICING_CONFIG = {
    // デフォルトターゲットマージン（38%）
    DEFAULT_TARGET_MARGIN: 38,

    // マージン許容誤差（±2%）
    MARGIN_TOLERANCE: 2,

    // サイズ別原価フォールバック係数
    SIZE_MULTIPLIERS: {
        '5XL': 1.67,
        '4XL': 1.67,
        '3XL': 1.67,
        '2XL': 1.33
    },

    // レート制限設定
    RATE_LIMITS: {
        PRICE_UPDATE_DELAY: 500,      // 商品間の待機時間（ms）
        SHOP_CHANGE_DELAY: 2000,      // ショップ間の待機時間（ms）
        GET_PUT_DELAY: 500            // GET→PUT間の待機時間（ms）
    }
};

// Blueprint原価を取得するヘルパー関数
function getBlueprintCost(blueprintId) {
    return BLUEPRINT_COSTS[blueprintId] || null;
}

// サイズ別の原価を計算
function getCostForSize(blueprintId, size) {
    const costInfo = BLUEPRINT_COSTS[blueprintId];
    if (!costInfo) return null;

    // サイズ指定がない場合はベースコスト
    if (!size) return costInfo.baseCost;

    // 特大サイズの場合、フォールバック処理
    if (size === '5XL') {
        return costInfo.extraCost['5XL']
            || costInfo.extraCost['4XL']
            || costInfo.extraCost['3XL']
            || Math.round(costInfo.baseCost * PRICING_CONFIG.SIZE_MULTIPLIERS['5XL']);
    }

    if (size === '4XL') {
        return costInfo.extraCost['4XL']
            || costInfo.extraCost['3XL']
            || Math.round(costInfo.baseCost * PRICING_CONFIG.SIZE_MULTIPLIERS['4XL']);
    }

    if (size === '3XL') {
        return costInfo.extraCost['3XL']
            || Math.round(costInfo.baseCost * PRICING_CONFIG.SIZE_MULTIPLIERS['3XL']);
    }

    if (size === '2XL') {
        return costInfo.extraCost['2XL']
            || Math.round(costInfo.baseCost * PRICING_CONFIG.SIZE_MULTIPLIERS['2XL']);
    }

    // その他のサイズ（S, M, L, XL）はベースコスト
    return costInfo.baseCost;
}

export {
    BLUEPRINT_COSTS,
    PRICING_CONFIG,
    getBlueprintCost,
    getCostForSize
};
