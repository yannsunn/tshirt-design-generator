// Printify商品の原価と利益率を確認するAPI（USD $X.99価格設定）
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const apiKey = process.env.PRINTIFY_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'PRINTIFY_API_KEY is not configured' });
        }

        // USD $X.99 価格計算関数
        const JPY_TO_USD = 150;
        const calculateOptimalPrice = (costJpy, targetMargin = 38) => {
            const costUsd = costJpy / JPY_TO_USD;
            const exactPriceUsd = costUsd / (1 - targetMargin / 100);
            const priceUsd = Math.ceil(exactPriceUsd) - 0.01;
            return Math.round(priceUsd * 100); // セント単位
        };

        // Blueprint原価とサイズ別価格
        const blueprints = [
            {
                id: 6,
                name: 'Gildan 5000 T-Shirt',
                baseCost: 900,
                extraCost: { '2XL': 1200, '3XL': 1500 }
            },
            {
                id: 26,
                name: 'Gildan 980 Lightweight Tee',
                baseCost: 1050,
                extraCost: { '2XL': 1350, '3XL': 1650 }
            },
            {
                id: 36,
                name: 'Gildan 2000 Ultra Cotton Tee',
                baseCost: 1200,
                extraCost: { '2XL': 1500, '3XL': 1800 }
            },
            {
                id: 145,
                name: 'Gildan 64000 Softstyle T-Shirt',
                baseCost: 1050,
                extraCost: { '2XL': 1350, '3XL': 1650 }
            },
            {
                id: 157,
                name: 'Gildan 5000B Kids Tee',
                baseCost: 750,
                extraCost: {}
            },
            {
                id: 80,
                name: 'Gildan 2400 Long Sleeve Tee',
                baseCost: 1350,
                extraCost: { '2XL': 1650, '3XL': 1950 }
            },
            {
                id: 49,
                name: 'Gildan 18000 Sweatshirt',
                baseCost: 2100,
                extraCost: { '2XL': 2550, '3XL': 3000 }
            },
            {
                id: 77,
                name: 'Gildan 18500 Hoodie',
                baseCost: 2550,
                extraCost: { '2XL': 3000, '3XL': 3450 }
            }
        ];

        const results = [];

        for (const blueprint of blueprints) {
            try {
                // 各サイズの価格を計算
                const sizeVariants = [
                    { size: 'S-XL', cost: blueprint.baseCost },
                    { size: '2XL', cost: blueprint.extraCost['2XL'] || blueprint.baseCost },
                    { size: '3XL', cost: blueprint.extraCost['3XL'] || blueprint.baseCost }
                ].filter(v => v.cost > 0);

                const variants = sizeVariants.map(variant => {
                    const priceInCents = calculateOptimalPrice(variant.cost);
                    const priceUsd = priceInCents / 100;
                    const costUsd = variant.cost / JPY_TO_USD;
                    const profit = priceUsd - costUsd;
                    const profitMargin = ((profit / priceUsd) * 100).toFixed(1);

                    return {
                        size: variant.size,
                        sellingPrice: `$${priceUsd.toFixed(2)}`,
                        baseCost: `¥${variant.cost} ($${costUsd.toFixed(2)})`,
                        profit: `$${profit.toFixed(2)}`,
                        profitMargin: `${profitMargin}%`,
                        meetsTarget: parseFloat(profitMargin) >= 38
                    };
                });

                results.push({
                    name: blueprint.name,
                    blueprintId: blueprint.id,
                    variants: variants,
                    allMeetTarget: variants.every(v => v.meetsTarget),
                    note: variants.every(v => v.meetsTarget) ? '✅ 全サイズが38%以上' : '⚠️ 一部サイズが38%未満'
                });

            } catch (error) {
                results.push({
                    name: blueprint.name,
                    blueprintId: blueprint.id,
                    error: error.message
                });
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        res.status(200).json({
            success: true,
            targetMargin: '38%',
            priceFormat: 'USD $X.99',
            conversionRate: `1 USD = ${JPY_TO_USD} JPY`,
            results: results,
            summary: {
                total: results.length,
                allMeetingTarget: results.filter(r => r.allMeetTarget).length,
                someIssues: results.filter(r => !r.allMeetTarget && !r.error).length
            }
        });

    } catch (error) {
        console.error('Error checking prices:', error);
        res.status(500).json({ error: error.message });
    }
}
