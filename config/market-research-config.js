// 市場リサーチ設定ファイル

// 市場リサーチ対象キーワード
const RESEARCH_KEYWORDS = [
    // 日本文化・観光
    'japanese souvenir t-shirt',
    'japan tokyo t-shirt',
    'mount fuji t-shirt',
    'cherry blossom t-shirt',
    'japanese kanji t-shirt',
    'samurai t-shirt',
    'ninja t-shirt',
    'ramen t-shirt',
    'sushi t-shirt',
    'zen buddhist t-shirt',

    // 日本アート・デザイン
    'japanese wave art t-shirt',
    'ukiyo-e t-shirt',
    'japanese dragon t-shirt',
    'koi fish t-shirt',
    'japanese streetwear t-shirt',

    // 日本ポップカルチャー
    'kawaii t-shirt',
    'anime japan t-shirt',
    'otaku t-shirt',
    'harajuku style t-shirt',
    'japanese street fashion',

    // 伝統・精神性
    'japanese traditional art t-shirt',
    'bushido t-shirt',
    'zen meditation t-shirt',
    'japanese calligraphy t-shirt',
    'wabi-sabi t-shirt'
];

// リサーチ結果の分析基準
const ANALYSIS_CRITERIA = {
    // 価格帯分析
    priceRanges: [
        { min: 0, max: 20, label: '低価格帯' },
        { min: 20, max: 35, label: '中価格帯' },
        { min: 35, max: 50, label: '高価格帯' },
        { min: 50, max: 999, label: 'プレミアム' }
    ],

    // 人気度判定基準
    popularityThresholds: {
        reviews: 50,      // 50件以上のレビュー
        rating: 4.5,      // 評価4.5以上
        favorites: 100    // 100以上のお気に入り
    },

    // デザインカテゴリー
    designCategories: [
        'minimalist',     // ミニマリスト
        'traditional',    // 伝統的
        'modern',         // モダン
        'cute',           // かわいい
        'cool',           // かっこいい
        'artistic',       // アーティスティック
        'humorous',       // ユーモラス
        'spiritual'       // スピリチュアル
    ]
};

// リサーチ対象プラットフォーム
const PLATFORMS = [
    {
        name: 'Etsy',
        url: 'https://www.etsy.com',
        searchPath: '/search?q=',
        targetMarket: 'グローバル（特に欧米インバウンド）',
        characteristics: '手作り・オリジナルデザイン重視、高価格帯'
    },
    {
        name: 'Amazon',
        url: 'https://www.amazon.com',
        searchPath: '/s?k=',
        targetMarket: 'グローバル全般',
        characteristics: '大量販売、低〜中価格帯'
    },
    {
        name: 'Redbubble',
        url: 'https://www.redbubble.com',
        searchPath: '/shop?query=',
        targetMarket: 'クリエイティブ層、若年層',
        characteristics: 'アーティスト重視、独自デザイン'
    },
    {
        name: 'TeePublic',
        url: 'https://www.teepublic.com',
        searchPath: '/search?query=',
        targetMarket: 'ポップカルチャーファン',
        characteristics: 'トレンド重視、ファンアート'
    }
];

// リサーチ結果の推奨事項
const RECOMMENDATIONS = {
    designThemes: [
        {
            theme: '富士山 × ミニマリズム',
            reason: 'インバウンド観光客に人気。シンプルで洗練されたデザインは欧米市場で高評価',
            priceRange: '$28-$35',
            targetAudience: '25-45歳、旅行好き、ミニマリスト'
        },
        {
            theme: '桜 × 禅',
            reason: '日本の精神性と美を表現。スピリチュアル・マインドフルネス層に響く',
            priceRange: '$30-$40',
            targetAudience: '30-50歳、ヨガ・瞑想愛好者'
        },
        {
            theme: 'ラーメン × ユーモア',
            reason: '日本食ブーム。カジュアルで親しみやすく若年層に人気',
            priceRange: '$22-$28',
            targetAudience: '18-35歳、食文化好き、カジュアル'
        },
        {
            theme: '漢字 × ストリート',
            reason: '漢字の美しさとストリートファッションの融合。都市部の若者に人気',
            priceRange: '$25-$35',
            targetAudience: '18-30歳、ストリートファッション好き'
        },
        {
            theme: '波 × アート（葛飾北斎風）',
            reason: '日本美術の代表作。アート愛好者・教養層に響く',
            priceRange: '$32-$42',
            targetAudience: '30-55歳、アート愛好者、文化的'
        }
    ],

    avoidThemes: [
        'アニメキャラクター（著作権リスク）',
        '過度に複雑なデザイン（印刷品質問題）',
        '政治的・宗教的メッセージ（論争リスク）',
        '低解像度の画像使用'
    ],

    pricingStrategy: {
        recommended: '$28-$35',
        reasoning: 'Etsyの日本関連Tシャツは平均$30前後。質感とデザイン性を重視する層がターゲット',
        margin: '38-42%'
    },

    seoKeywords: [
        'Japanese t-shirt',
        'Japan souvenir',
        'Japanese art tee',
        'Tokyo shirt',
        'Mount Fuji',
        'Cherry blossom',
        'Japanese design',
        'Asian inspired',
        'Japan travel gift',
        'Japanese culture shirt'
    ]
};

module.exports = {
    RESEARCH_KEYWORDS,
    ANALYSIS_CRITERIA,
    PLATFORMS,
    RECOMMENDATIONS
};
