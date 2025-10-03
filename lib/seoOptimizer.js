// プラットフォーム別SEO最適化ヘルパー

/**
 * Etsy SEO最適化
 * - タイトル: 140文字以内
 * - 重要キーワードを前方に配置
 * - 「Handmade」「Unique」「Gift」などEtsy好みのキーワードを追加
 */
export function optimizeForEtsy(productData) {
    const { title, description, tags } = productData;

    // Etsyタイトル最適化（140文字制限）
    const etsyTitle = `${title} | Unique Japanese Design T-Shirt | Handmade Gift`.substring(0, 140);

    // Etsy説明文最適化
    const etsyDescription = `
🎨 UNIQUE HANDMADE DESIGN

${description || 'Beautiful Japanese-inspired design, perfect for gift giving or personal style.'}

✨ FEATURES:
• Premium quality fabric
• Vibrant, long-lasting print
• Comfortable fit
• Unique AI-generated design

🎁 PERFECT GIFT for:
• Japan culture lovers
• Anime & manga fans
• Unique style seekers
• Birthday & special occasions

📦 FAST SHIPPING with Printify Express (where available)

⭐ MADE TO ORDER - Each piece is specially printed just for you!

#JapaneseDesign #UniqueGift #HandmadeStyle #TshirtArt
    `.trim();

    // Etsyタグ最適化（最大13個、20文字以内）
    const etsyTags = [
        'japanese tshirt',
        'unique design',
        'handmade gift',
        'anime style',
        'japan culture',
        'custom tshirt',
        'ai generated',
        'tourist gift',
        'otaku fashion',
        'kawaii clothing',
        'asian design',
        'graphic tee',
        'streetwear'
    ].slice(0, 13);

    return {
        title: etsyTitle,
        description: etsyDescription,
        tags: etsyTags
    };
}

/**
 * eBay SEO最適化
 * - タイトル: 80文字以内
 * - ブランド名・サイズ・色などの重要情報を含める
 * - 検索されやすいキーワードを優先
 */
export function optimizeForEbay(productData) {
    const { title, description, tags } = productData;

    // eBayタイトル最適化（80文字制限）
    const ebayTitle = `${title} - Japanese Design Graphic Tee Anime Manga Style`.substring(0, 80);

    // eBay説明文最適化（HTML対応）
    const ebayDescription = `
<div style="font-family: Arial, sans-serif; max-width: 800px;">
<h2>🎨 ${title}</h2>

<p><strong>${description || 'Unique Japanese-inspired graphic t-shirt with AI-generated design.'}</strong></p>

<h3>Product Features:</h3>
<ul>
<li>✅ High-quality fabric for comfort and durability</li>
<li>✅ Vibrant, fade-resistant print</li>
<li>✅ Unisex sizing for versatile fit</li>
<li>✅ Made-to-order for guaranteed freshness</li>
<li>✅ Multiple sizes available (S-5XL)</li>
</ul>

<h3>Perfect For:</h3>
<ul>
<li>🎌 Japan enthusiasts</li>
<li>🎭 Anime and manga fans</li>
<li>🎁 Unique gift seekers</li>
<li>👕 Streetwear collectors</li>
</ul>

<h3>Shipping & Production:</h3>
<p>⚡ Ships from USA via Printify<br>
📦 Typical production: 2-7 business days<br>
🚚 Standard shipping: 5-10 business days</p>

<p><em>Each item is made to order to reduce waste and ensure quality!</em></p>
</div>
    `.trim();

    // eBayタグ/キーワード
    const ebayKeywords = [
        'Japanese T-Shirt',
        'Anime Graphic Tee',
        'Manga Style Shirt',
        'Japan Culture',
        'Unique Design',
        'AI Generated Art',
        'Streetwear Fashion',
        'Otaku Clothing',
        'Asian Design Tee',
        'Custom Graphic Shirt'
    ];

    return {
        title: ebayTitle,
        description: ebayDescription,
        keywords: ebayKeywords
    };
}

/**
 * 一括SEO最適化（全プラットフォーム）
 */
export function optimizeForAllPlatforms(productData) {
    return {
        etsy: optimizeForEtsy(productData),
        ebay: optimizeForEbay(productData)
    };
}
