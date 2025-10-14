// 価格計算サービス
// 最適価格の計算ロジックを提供

import { PRICING_CONFIG, getCostForSize } from '../config/pricing-config.js';

/**
 * USD $X.99 形式で最適価格を計算
 * @param {number} costCents - 原価（セント単位）
 * @param {number} targetMargin - ターゲットマージン（%）
 * @returns {number} 最適価格（セント単位）
 */
function calculateOptimalPrice(costCents, targetMargin = PRICING_CONFIG.DEFAULT_TARGET_MARGIN) {
    const costUsd = costCents / 100;
    const exactPriceUsd = costUsd / (1 - targetMargin / 100);
    const priceUsd = Math.ceil(exactPriceUsd) - 0.01;  // $X.99形式
    return Math.round(priceUsd * 100);  // セント単位で返す
}

/**
 * 実際のマージン率を計算
 * @param {number} priceCents - 販売価格（セント単位）
 * @param {number} costCents - 原価（セント単位）
 * @returns {number} マージン率（%）
 */
function calculateActualMargin(priceCents, costCents) {
    if (priceCents <= 0) return 0;
    const priceUsd = priceCents / 100;
    const costUsd = costCents / 100;
    const profit = priceUsd - costUsd;
    return (profit / priceUsd) * 100;
}

/**
 * 価格が最適かどうかを判定
 * @param {number} actualMargin - 実際のマージン（%）
 * @param {number} targetMargin - ターゲットマージン（%）
 * @returns {boolean} 最適な場合true
 */
function isPriceOptimal(actualMargin, targetMargin = PRICING_CONFIG.DEFAULT_TARGET_MARGIN) {
    return Math.abs(actualMargin - targetMargin) <= PRICING_CONFIG.MARGIN_TOLERANCE;
}

/**
 * バリアント（サイズ別）の原価を取得
 * @param {string} variantTitle - バリアントのタイトル（例："2XL / White"）
 * @param {number} blueprintId - Blueprint ID
 * @returns {number|null} 原価（セント単位）、見つからない場合null
 */
function getVariantCost(variantTitle, blueprintId) {
    // サイズを抽出
    const sizeMatch = variantTitle.match(/\b(5XL|4XL|3XL|2XL|XL|L|M|S)\b/);
    const size = sizeMatch ? sizeMatch[1] : null;

    return getCostForSize(blueprintId, size);
}

/**
 * バリアントの最適価格情報を計算
 * @param {Object} variant - Printify variant object
 * @param {number} blueprintId - Blueprint ID
 * @param {number} targetMargin - ターゲットマージン（%）
 * @returns {Object} 価格分析情報
 */
function analyzeVariantPricing(variant, blueprintId, targetMargin = PRICING_CONFIG.DEFAULT_TARGET_MARGIN) {
    const variantTitle = variant.title || '';
    const cost = getVariantCost(variantTitle, blueprintId);

    if (cost === null) {
        return {
            variantId: variant.id,
            title: variantTitle,
            error: 'Unknown blueprint or cost not found'
        };
    }

    const currentPrice = variant.price || 0;
    const optimalPrice = calculateOptimalPrice(cost, targetMargin);
    const actualMargin = calculateActualMargin(currentPrice, cost);
    const optimalMargin = calculateActualMargin(optimalPrice, cost);
    const needsUpdate = !isPriceOptimal(actualMargin, targetMargin);

    return {
        variantId: variant.id,
        title: variantTitle,
        cost: cost,
        costUsd: (cost / 100).toFixed(2),
        currentPrice: currentPrice,
        currentPriceUsd: (currentPrice / 100).toFixed(2),
        actualMargin: actualMargin.toFixed(1),
        optimalPrice: optimalPrice,
        optimalPriceUsd: (optimalPrice / 100).toFixed(2),
        optimalMargin: optimalMargin.toFixed(1),
        needsUpdate: needsUpdate,
        priceDifference: optimalPrice - currentPrice,
        priceDifferenceUsd: ((optimalPrice - currentPrice) / 100).toFixed(2)
    };
}

/**
 * 商品全体の価格を分析
 * @param {Object} productDetail - Printify product detail object
 * @param {number} targetMargin - ターゲットマージン（%）
 * @returns {Object} 商品価格分析情報
 */
function analyzeProductPricing(productDetail, targetMargin = PRICING_CONFIG.DEFAULT_TARGET_MARGIN) {
    const blueprintId = productDetail.blueprint_id;
    const variants = productDetail.variants || [];

    const variantAnalysis = variants.map(variant =>
        analyzeVariantPricing(variant, blueprintId, targetMargin)
    );

    const needsUpdate = variantAnalysis.some(v => v.needsUpdate);
    const hasErrors = variantAnalysis.some(v => v.error);

    return {
        productId: productDetail.id,
        title: productDetail.title,
        blueprintId: blueprintId,
        variants: variantAnalysis,
        needsUpdate: needsUpdate,
        hasErrors: hasErrors,
        summary: {
            totalVariants: variants.length,
            needsUpdateCount: variantAnalysis.filter(v => v.needsUpdate).length,
            optimalCount: variantAnalysis.filter(v => !v.needsUpdate && !v.error).length,
            errorCount: variantAnalysis.filter(v => v.error).length
        }
    };
}

/**
 * 更新用のバリアント配列を生成
 * @param {Array} variants - Printify variants array
 * @param {number} blueprintId - Blueprint ID
 * @param {number} targetMargin - ターゲットマージン（%）
 * @returns {Array} 更新用バリアント配列
 */
function generateUpdatedVariants(variants, blueprintId, targetMargin = PRICING_CONFIG.DEFAULT_TARGET_MARGIN) {
    return variants.map(variant => {
        const analysis = analyzeVariantPricing(variant, blueprintId, targetMargin);

        return {
            id: variant.id,
            price: analysis.optimalPrice || variant.price,
            is_enabled: variant.is_enabled
        };
    });
}

export {
    calculateOptimalPrice,
    calculateActualMargin,
    isPriceOptimal,
    getVariantCost,
    analyzeVariantPricing,
    analyzeProductPricing,
    generateUpdatedVariants
};
