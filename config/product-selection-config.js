// 商品選定設定ファイル

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

module.exports = {
    STOREFRONT_SHOP_ID,
    TARGET_COUNT,
    RECOMMENDED_THEMES,
    EXCLUDE_KEYWORDS
};
