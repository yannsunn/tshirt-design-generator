// Blueprint価格データ（マスター商品から抽出）
// 円単位（例: 1599 = ¥1599）
// 最終更新: 2025-10-12

export const blueprintPricing = {
    // Gildan 5000 T-Shirt
    6: {
        name: 'Gildan 5000 T-Shirt',
        prices: {
            'S': { cost: 950, price: 2999 },
            'M': { cost: 950, price: 2999 },
            'L': { cost: 950, price: 2999 },
            'XL': { cost: 950, price: 2999 },
            '2XL': { cost: 1145, price: 2999 },
            '3XL': { cost: 1257, price: 2999 },
            '4XL': { cost: 1319, price: 2999 },
            '5XL': { cost: 1317, price: 2999 }
        }
    },

    // Gildan 980 Lightweight
    26: {
        name: 'Gildan 980 Lightweight',
        prices: {
            'S': { cost: 1162, price: 1799 },
            'M': { cost: 1162, price: 1799 },
            'L': { cost: 1162, price: 596 },
            'XL': { cost: 1162, price: 1799 },
            '2XL': { cost: 1371, price: 1377 },
            '3XL': { cost: 1556, price: 2499 }
        }
    },

    // Gildan 2000 Ultra Cotton
    36: {
        name: 'Gildan 2000 Ultra Cotton',
        prices: {
            'S': { cost: 1051, price: 2999 },
            'M': { cost: 1051, price: 1699 },
            'L': { cost: 1051, price: 2999 },
            'XL': { cost: 1051, price: 2999 },
            '2XL': { cost: 1264, price: 2999 },
            '3XL': { cost: 1363, price: 2199 },
            '4XL': { cost: 1693, price: 1693 },
            '5XL': { cost: 1731, price: 2999 }
        }
    },

    // Gildan 18000 Sweatshirt
    49: {
        name: 'Gildan 18000 Sweatshirt',
        prices: {
            'S': { cost: 1797, price: 2799 },
            'M': { cost: 1797, price: 2799 },
            'L': { cost: 1797, price: 2799 },
            'XL': { cost: 1797, price: 2999 },
            '2XL': { cost: 2068, price: 2999 },
            '3XL': { cost: 2214, price: 2999 },
            '4XL': { cost: 2502, price: 2502 },
            '5XL': { cost: 2523, price: 2999 }
        }
    },

    // Gildan 18500 Hoodie
    77: {
        name: 'Gildan 18500 Hoodie',
        prices: {
            'S': { cost: 2158, price: 3399 },
            'M': { cost: 2158, price: 2999 },
            'L': { cost: 2158, price: 3399 },
            'XL': { cost: 2158, price: 2999 },
            '2XL': { cost: 2378, price: 2999 },
            '3XL': { cost: 2503, price: 2999 },
            '4XL': { cost: 2549, price: 2999 },
            '5XL': { cost: 2548, price: 4099 }
        }
    },

    // Gildan 2400 Long Sleeve
    80: {
        name: 'Gildan 2400 Long Sleeve',
        prices: {
            'S': { cost: 1259, price: 1999 },
            'M': { cost: 1259, price: 1999 },
            'L': { cost: 1259, price: 1999 },
            'XL': { cost: 1259, price: 1999 },
            '2XL': { cost: 1453, price: 2299 },
            '3XL': { cost: 1580, price: 2499 },
            '4XL': { cost: 1582, price: 2499 },
            '5XL': { cost: 1757, price: 2999 }
        }
    },

    // Gildan 64000 Softstyle
    145: {
        name: 'Gildan 64000 Softstyle',
        prices: {
            'XS': { cost: 988, price: 2999 },
            'S': { cost: 988, price: 1599 },
            'M': { cost: 988, price: 2999 },
            'L': { cost: 988, price: 2999 },
            'XL': { cost: 988, price: 1599 },
            '2XL': { cost: 1129, price: 1799 },
            '3XL': { cost: 1248, price: 2999 },
            '4XL': { cost: 1382, price: 2999 },
            '5XL': { cost: 1502, price: 2999 }
        }
    },

    // Gildan 5000B Kids Tee
    157: {
        name: 'Gildan 5000B Kids Tee',
        prices: {
            'XS': { cost: 698, price: 1099 },
            'S': { cost: 698, price: 1099 },
            'M': { cost: 698, price: 1099 },
            'L': { cost: 698, price: 1099 },
            'XL': { cost: 698, price: 1099 }
        }
    }
};

// サイズを抽出する関数
function extractSize(variantTitle) {
    const sizeMatch = variantTitle.match(/\b(XS|S|M|L|XL|2XL|3XL|4XL|5XL)\b/);
    return sizeMatch ? sizeMatch[0] : null;
}

// バリアント価格を取得（マスター商品の価格をそのまま使用）
export function calculateVariantPrice(blueprintId, variantTitle) {
    const pricing = blueprintPricing[blueprintId];
    if (!pricing) {
        console.warn(`Unknown blueprint ID: ${blueprintId}`);
        return null;
    }

    const size = extractSize(variantTitle);
    if (!size || !pricing.prices[size]) {
        console.warn(`Unknown size for variant: ${variantTitle} (Blueprint ${blueprintId})`);
        return null;
    }

    return pricing.prices[size].price;
}

// 原価を取得
export function getVariantCost(blueprintId, variantTitle) {
    const pricing = blueprintPricing[blueprintId];
    if (!pricing) return null;

    const size = extractSize(variantTitle);
    if (!size || !pricing.prices[size]) return null;

    return pricing.prices[size].cost;
}

// 利益率を計算
export function calculateMargin(blueprintId, variantTitle) {
    const pricing = blueprintPricing[blueprintId];
    if (!pricing) return null;

    const size = extractSize(variantTitle);
    if (!size || !pricing.prices[size]) return null;

    const { cost, price } = pricing.prices[size];
    return ((price - cost) / price * 100).toFixed(1);
}

// 後方互換性のため（古いコード用）
export const blueprintCosts = blueprintPricing;
export function calculateOptimalPrice(costCents, targetMargin = 38) {
    const costYen = costCents;
    const exactPrice = costYen / (1 - targetMargin / 100);
    return Math.ceil(exactPrice);
}
