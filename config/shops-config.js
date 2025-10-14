// ショップ設定ファイル
// 全Printifyショップの設定を一元管理

const SHOPS = {
    // Storefront（マスター商品管理用）
    STOREFRONT: {
        id: '24565480',
        name: 'AwakeInc (Storefront)',
        type: 'master',
        targetMargin: 0.38,  // 38%
        description: 'マスター商品を管理するストアフロント'
    },

    // Etsy（グローバル販売）
    ETSY: {
        id: '24566474',
        name: 'My Etsy Store',
        type: 'sales',
        targetMargin: 0.38,  // 38%
        description: '欧米インバウンド観光客向けグローバル市場'
    },

    // eBay Samurai（テーマ別販売）
    EBAY_SAMURAI: {
        id: '24566516',
        name: 'Awake (eBay)',
        type: 'sales',
        targetMargin: 0.38,  // 38%
        description: 'サムライ・忍者テーマ専門'
    }
};

// ショップIDから設定を取得するヘルパー関数
function getShopById(shopId) {
    return Object.values(SHOPS).find(shop => shop.id === shopId);
}

// 全ショップの配列を取得
function getAllShops() {
    return Object.values(SHOPS);
}

// 販売用ショップのみ取得
function getSalesShops() {
    return Object.values(SHOPS).filter(shop => shop.type === 'sales');
}

// マスターショップを取得
function getMasterShop() {
    return Object.values(SHOPS).find(shop => shop.type === 'master');
}

export {
    SHOPS,
    getShopById,
    getAllShops,
    getSalesShops,
    getMasterShop
};
