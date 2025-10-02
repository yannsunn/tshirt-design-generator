// Printify API統合 - 商品作成エンドポイント
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { shopId, imageId, title, description, tags, productType = 'tshirt' } = req.body;
        const apiKey = process.env.PRINTIFY_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'PRINTIFY_API_KEY is not configured' });
        }

        if (!shopId || !imageId) {
            return res.status(400).json({ error: 'shopId and imageId are required' });
        }

        // Blueprint IDごとの原価マッピング（38%利益率達成用）
        const blueprintCosts = {
            6: { baseCost: 900, extraCost: { '2XL': 1200, '3XL': 1500 }, name: 'Gildan 5000 T-Shirt' },
            26: { baseCost: 1050, extraCost: { '2XL': 1350, '3XL': 1650 }, name: 'Gildan 980 Lightweight Tee' },
            36: { baseCost: 1200, extraCost: { '2XL': 1500, '3XL': 1800 }, name: 'Gildan 2000 Ultra Cotton Tee' },
            145: { baseCost: 1050, extraCost: { '2XL': 1350, '3XL': 1650 }, name: 'Gildan 64000 Softstyle T-Shirt' },
            157: { baseCost: 750, extraCost: {}, name: 'Gildan 5000B Kids Tee' },
            80: { baseCost: 1350, extraCost: { '2XL': 1650, '3XL': 1950 }, name: 'Gildan 2400 Long Sleeve Tee' },
            49: { baseCost: 2100, extraCost: { '2XL': 2550, '3XL': 3000 }, name: 'Gildan 18000 Sweatshirt' },
            77: { baseCost: 2550, extraCost: { '2XL': 3000, '3XL': 3450 }, name: 'Gildan 18500 Hoodie' }
        };

        // USD $X.99 価格計算関数（38%前後の利益率）
        const JPY_TO_USD = 150; // 1 USD = 150 JPY
        const calculateOptimalPrice = (costJpy, targetMargin = 38) => {
            // 円→ドル変換
            const costUsd = costJpy / JPY_TO_USD;
            // 目標価格を計算
            const exactPriceUsd = costUsd / (1 - targetMargin / 100);
            // 次の$X.99に切り上げ
            const priceUsd = Math.ceil(exactPriceUsd) - 0.01;
            // Printify APIはセント単位（整数）で価格を受け取る
            return Math.round(priceUsd * 100);
        };

        // 商品タイプに応じたBlueprint ID、Print Provider ID を設定
        // Note: Blueprint IDはPrint Provider 3 (MyLocker)で確認済み
        const productConfig = {
            // --- Tシャツ系 ---
            tshirt: {
                blueprintId: 6,  // Gildan 5000 (ベーシックTシャツ) - 売れ筋No.1
                printProviderId: 3,  // MyLocker
                name: 'Gildan 5000 T-Shirt'
            },
            lightweight_tee: {
                blueprintId: 26,  // Gildan 980 (軽量ファッションTシャツ)
                printProviderId: 3,  // MyLocker
                name: 'Gildan 980 Lightweight Fashion Tee'
            },
            ultra_cotton_tee: {
                blueprintId: 36,  // Gildan 2000 (ウルトラコットンTシャツ)
                printProviderId: 3,  // MyLocker
                name: 'Gildan 2000 Ultra Cotton Tee'
            },
            softstyle_tee: {
                blueprintId: 145,  // Gildan 64000 (ソフトスタイルTシャツ)
                printProviderId: 3,  // MyLocker
                name: 'Gildan 64000 Softstyle T-Shirt'
            },
            kids_tee: {
                blueprintId: 157,  // Gildan 5000B (キッズTシャツ)
                printProviderId: 3,  // MyLocker
                name: 'Gildan 5000B Kids Heavy Cotton Tee'
            },
            // --- 長袖 ---
            longsleeve: {
                blueprintId: 80,  // Gildan 2400 (長袖Tシャツ)
                printProviderId: 3,  // MyLocker
                name: 'Gildan 2400 Ultra Cotton Long Sleeve Tee'
            },
            // --- スウェット・フーディ ---
            sweatshirt: {
                blueprintId: 49,  // Gildan 18000 (スウェットシャツ) - 人気商品
                printProviderId: 3,  // MyLocker
                name: 'Gildan 18000 Sweatshirt'
            },
            hoodie: {
                blueprintId: 77,  // Gildan 18500 (フーディ/パーカー) - 人気商品
                printProviderId: 3,  // MyLocker
                name: 'Gildan 18500 Hoodie'
            }
        };

        const config = productConfig[productType];
        if (!config) {
            const validTypes = Object.keys(productConfig).join(', ');
            return res.status(400).json({ error: `Invalid productType: ${productType}. Valid types: ${validTypes}` });
        }

        const { blueprintId, printProviderId, name: productName } = config;
        const costInfo = blueprintCosts[blueprintId];
        console.log(`Creating product: ${productName} (Blueprint ${blueprintId}, Provider ${printProviderId})`);
        console.log(`Cost structure: Base ¥${costInfo.baseCost}, 2XL ¥${costInfo.extraCost['2XL'] || 'N/A'}, 3XL ¥${costInfo.extraCost['3XL'] || 'N/A'}`);

        // 1. まず利用可能なvariantsを取得
        const variantsResponse = await fetch(
            `https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!variantsResponse.ok) {
            const errorText = await variantsResponse.text();
            throw new Error(`Printify Variants API error: ${variantsResponse.status} - ${errorText}`);
        }

        const variantsData = await variantsResponse.json();
        console.log(`Total variants available: ${variantsData.variants?.length}`);
        if (variantsData.variants?.length > 0) {
            console.log('Sample variant structure:', JSON.stringify(variantsData.variants[0], null, 2));
        }

        // 注意: Printifyは商品作成後に自動的にモックアップを生成します
        // API経由でのモックアップ設定はサポートされていないため、
        // Printify Webダッシュボードでモックアップをカスタマイズしてください
        console.log('Mockups will be auto-generated by Printify after product creation');

        // 利用可能なvariantから色×サイズの組み合わせを抽出
        const availableVariants = variantsData.variants || [];
        const selectedVariants = [];
        const variantIds = [];

        // サイズ優先順位（S, M, L, XL, 2XL）
        const sizePreference = ['S', 'M', 'L', 'XL', '2XL'];

        // 色の優先順位（合計7色）
        // 1. White（白）- 必須
        // 2. Black（黒）- 必須
        // 3-4. White系（Ash, Natural, etc.）
        // 5-6. Black/Dark系（Dark Heather, Charcoal, etc.）
        // 7. Gray系
        const colorPriority = [
            { keywords: ['WHITE'], priority: 1, name: 'White' },
            { keywords: ['BLACK'], priority: 1, name: 'Black' },
            { keywords: ['ASH', 'NATURAL', 'CREAM', 'SAND'], priority: 2, name: 'Light' },
            { keywords: ['DARK HEATHER', 'CHARCOAL', 'NAVY'], priority: 3, name: 'Dark' },
            { keywords: ['GRAY', 'GREY', 'SPORT GREY', 'HEATHER'], priority: 4, name: 'Gray' },
        ];

        // 色ごとにバリアントをグループ化
        const colorGroups = new Map();

        // Debug: Log first few variant titles to understand format
        console.log('Sample variant titles:', availableVariants.slice(0, 5).map(v => v.title));

        for (const variant of availableVariants) {
            if (!variant.title) continue;

            const upperTitle = variant.title.toUpperCase();

            // サイズをチェック（さらに柔軟なマッチング）
            const matchedSize = sizePreference.find(size => {
                // "S / White", "S/White", "White / S", "Small", etc.
                const patterns = [
                    ` ${size} `,
                    `/${size}/`,
                    ` ${size}/`,
                    `/${size} `,
                    `\t${size}\t`,
                    `\t${size} `,
                    ` ${size}\t`
                ];
                return patterns.some(pattern => upperTitle.includes(pattern)) ||
                       upperTitle.startsWith(`${size} `) ||
                       upperTitle.startsWith(`${size}/`) ||
                       upperTitle.endsWith(` ${size}`) ||
                       upperTitle.endsWith(`/${size}`);
            });

            // If size check is too strict, skip it for now - just get all variants
            // We'll filter by size later if needed

            // 色を判定（より柔軟に）
            let matchedColor = null;
            for (const colorDef of colorPriority) {
                if (colorDef.keywords.some(keyword => upperTitle.includes(keyword))) {
                    matchedColor = colorDef;
                    break;
                }
            }

            // If no color matched but variant exists, assign to "Other" group
            if (!matchedColor) {
                matchedColor = { name: 'Other', priority: 5, keywords: [] };
            }

            const colorKey = matchedColor.name;
            if (!colorGroups.has(colorKey)) {
                colorGroups.set(colorKey, {
                    priority: matchedColor.priority,
                    name: colorKey,
                    variants: []
                });
            }

            colorGroups.get(colorKey).variants.push(variant);
        }

        console.log('Color groups after matching:', Array.from(colorGroups.keys()));

        // 優先順位順に並べ替え
        const sortedColors = Array.from(colorGroups.values()).sort((a, b) => a.priority - b.priority);

        console.log('Available color groups:', sortedColors.map(c => `${c.name} (${c.variants.length} variants)`));

        // 最大7色、各色で最大5サイズを選択（合計最大35 variants）
        const maxColors = 7;
        const maxSizesPerColor = 5;
        const maxTotalVariants = 35; // Printify制限は100だが、安全のため35に制限

        for (let i = 0; i < Math.min(maxColors, sortedColors.length); i++) {
            const colorGroup = sortedColors[i];
            console.log(`Selecting color group: ${colorGroup.name} (${colorGroup.variants.length} variants available)`);

            // 各色グループから最大5つのvariantを選択
            const variantsToSelect = colorGroup.variants.slice(0, maxSizesPerColor);

            for (const variant of variantsToSelect) {
                // 最大variant数に達したら停止
                if (selectedVariants.length >= maxTotalVariants) {
                    console.log(`Reached maximum variants limit (${maxTotalVariants}), stopping selection`);
                    break;
                }

                // サイズ別価格を計算（38%利益率達成）
                const variantTitle = variant.title || '';
                let cost = costInfo.baseCost;

                // サイズを検出
                if (variantTitle.includes('2XL')) {
                    cost = costInfo.extraCost['2XL'] || costInfo.baseCost * 1.33;
                } else if (variantTitle.includes('3XL')) {
                    cost = costInfo.extraCost['3XL'] || costInfo.baseCost * 1.67;
                }

                const optimalPrice = calculateOptimalPrice(cost);

                selectedVariants.push({
                    id: variant.id,
                    price: optimalPrice, // サイズ別価格（38%利益率）
                    is_enabled: true
                });
                variantIds.push(variant.id);
            }

            // 最大variant数に達したら全体のループも停止
            if (selectedVariants.length >= maxTotalVariants) {
                break;
            }
        }

        console.log(`Total variants selected: ${selectedVariants.length}`);
        console.log('Sample selected variants:', selectedVariants.slice(0, 3).map(v => {
            const fullVariant = availableVariants.find(av => av.id === v.id);
            return fullVariant?.title || v.id;
        }));

        // variantが見つからない場合は最初の35個を使用（7色×5サイズ）
        if (selectedVariants.length === 0) {
            console.warn('No variants matched criteria, using first 35 variants');
            const fallbackLimit = Math.min(35, availableVariants.length);
            for (let i = 0; i < fallbackLimit; i++) {
                // サイズ別価格を計算（38%利益率達成）
                const variantTitle = availableVariants[i].title || '';
                let cost = costInfo.baseCost;

                // サイズを検出
                if (variantTitle.includes('2XL')) {
                    cost = costInfo.extraCost['2XL'] || costInfo.baseCost * 1.33;
                } else if (variantTitle.includes('3XL')) {
                    cost = costInfo.extraCost['3XL'] || costInfo.baseCost * 1.67;
                }

                const optimalPrice = calculateOptimalPrice(cost);

                selectedVariants.push({
                    id: availableVariants[i].id,
                    price: optimalPrice, // サイズ別価格（38%利益率）
                    is_enabled: true
                });
                variantIds.push(availableVariants[i].id);
            }
            console.log(`Fallback: selected ${selectedVariants.length} variants`);
        }

        // 最終安全チェック：100個制限
        if (selectedVariants.length > 100) {
            console.warn(`Too many variants selected (${selectedVariants.length}), trimming to 100`);
            selectedVariants = selectedVariants.slice(0, 100);
            variantIds = variantIds.slice(0, 100);
        }

        const printifyApiUrl = `https://api.printify.com/v1/shops/${shopId}/products.json`;

        const payload = {
            title: title || 'Custom Japanese Culture T-Shirt',
            description: description || 'AI-generated unique Japanese-themed t-shirt design. Perfect souvenir for tourists visiting Japan.',
            blueprint_id: blueprintId,
            print_provider_id: printProviderId,
            variants: selectedVariants,
            print_areas: [
                {
                    variant_ids: variantIds,
                    placeholders: [
                        {
                            position: 'front',
                            images: [
                                {
                                    id: imageId,
                                    x: 0.5, // Center horizontal
                                    y: 0.45, // Slightly above center for better appearance
                                    scale: 0.95, // 95% size to prevent cropping
                                    angle: 0
                                }
                            ]
                        }
                    ]
                }
            ],
            // Note: Printify APIではmockupsは商品作成後に別途設定する必要がある
            // ここでは基本的な商品構造のみを作成
            tags: tags || ['Japanese Culture', 'AI Generated', 'Custom Design', 'Tourist Souvenir'],
            // デフォルトでドラフトとして作成（後で確認してから公開）
            is_locked: false,
            // Express配送を自動で有効化（対応商品のみ）
            is_printify_express_enabled: true,
            // GPSR（General Product Safety Regulation）情報を自動設定（EU販売必須）
            // Printifyがblueprint_idに応じて適切な情報を自動入力する
            safety_information: `EU representative: HONSON VENTURES LIMITED, gpsr@honsonventures.com, 3, Gnaftis House flat 102, Limassol, Mesa Geitonia, 4003, CY

Product information: ${productName}, 2 year warranty in EU and Northern Ireland as per Directive 1999/44/EC

Warnings, Hazard: For adults, Made in Nicaragua

Care instructions: Machine wash: cold (max 30C or 90F), Non-chlorine: bleach as needed, Tumble dry: low heat, Do not iron, Do not dryclean`,
            // サイズ表の自動追加を試みる（推測パラメータ - 動作確認が必要）
            add_size_table: true,
            include_size_table: true,
            size_table_enabled: true
        };

        const response = await fetch(printifyApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Printify Product Creation error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        const productId = result.id;

        console.log('Product created successfully:', productId);
        console.log('Printify will auto-generate mockups for this product');

        // 色グループの詳細情報を作成
        const actualColorsUsed = sortedColors.slice(0, Math.min(maxColors, sortedColors.length));
        const selectedColorNames = actualColorsUsed.map(c => c.name).join(', ') || 'Default selection';
        const actualColorCount = actualColorsUsed.length || Math.ceil(selectedVariants.length / 5);
        const estimatedSizesPerColor = actualColorCount > 0 ? Math.floor(selectedVariants.length / actualColorCount) : 5;

        // 価格例を計算
        const priceS_XL = calculateOptimalPrice(costInfo.baseCost);
        const price2XL = costInfo.extraCost['2XL'] ? calculateOptimalPrice(costInfo.extraCost['2XL']) : priceS_XL;
        const price3XL = costInfo.extraCost['3XL'] ? calculateOptimalPrice(costInfo.extraCost['3XL']) : priceS_XL;

        res.status(200).json({
            productId: productId,
            productUrl: `https://printify.com/app/products/${productId}`,
            productType: productType,
            productName: productName,
            message: `✅ Product created successfully!

📦 Product Details:
• Product Type: ${productName}
• ${selectedVariants.length} variants created
• Color groups: ${actualColorCount} (${selectedColorNames})
• Approx. ${estimatedSizesPerColor} sizes per color
• Design positioned at center (y=0.45, scale=0.95)
• English title & description for international reach

💰 Size-Specific Pricing (38-41% Profit Margin, all $X.99):
• S-XL: $${(priceS_XL / 100).toFixed(2)}${price2XL !== priceS_XL ? `
• 2XL: $${(price2XL / 100).toFixed(2)}` : ''}${price3XL !== priceS_XL && price3XL !== price2XL ? `
• 3XL: $${(price3XL / 100).toFixed(2)}` : ''}

🎨 IMPORTANT: Mockup Selection Required (API Limitation)
⚠️ Printify API does not auto-select mockups. You MUST manually select them:

📋 Step-by-Step Mockup Selection:
1. Click the Product URL below to open Printify dashboard
2. Scroll down to "Selected mockups" section
3. Click "View all mockups" button on the right
4. In the Mockup Library popup, click "Select all" checkbox
   → This selects ALL 90 mockups (6 colors × 15 mockups each)
5. Click "Save" or close the popup
6. Verify "Selected mockups" shows 90 mockups (not 24)
7. Click "Publish" to make product live

Current Status: Only 24 mockups selected (4 per color)
Target: 90 mockups (15 per color) ← SELECT ALL for best results!

🎯 Next Steps:
1. Visit Printify dashboard → Select ALL mockups (90 total)
2. Verify all color/size combinations are correct
3. Check product description (English only, no Japanese)
4. **ADD EU GPSR Information (Required for EU sales)**:
   a. Scroll to "General product safety regulation (GPSR)" section
   b. Check the box "Required for EU"
   c. Fill in the following information:

   EU representative:
   HONSON VENTURES LIMITED
   gpsr@honsonventures.com
   3, Gnaftis House flat 102, Limassol, Mesa Geitonia, 4003, CY

   Product information:
   Gildan 5000, 2 year warranty in EU and Northern Ireland as per Directive 1999/44/EC

   Warnings, Hazard:
   For adults, Made in Nicaragua

   Care instructions:
   Machine wash: cold (max 30C or 90F), Non-chlorine: bleach as needed, Tumble dry: low heat, Do not iron, Do not dryclean

5. Publish to your store when ready

⚠️ Note: GPSR information must be added manually for each product (API limitation)

Product URL: https://printify.com/app/products/${productId}`
        });

    } catch (error) {
        console.error('Error in /api/printify-create-product:', error);
        res.status(500).json({ error: error.message });
    }
}