// Printify商品の原価と利益率を確認するAPI
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const apiKey = process.env.PRINTIFY_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'PRINTIFY_API_KEY is not configured' });
        }

        const printProviderId = 3; // MyLocker
        // 一般的なPrintify MyLocker原価（¥150/$1換算）
        const blueprints = [
            { id: 6, name: 'Gildan 5000 T-Shirt', price: 2500, estimatedCost: 900 },  // $6 × 150
            { id: 26, name: 'Gildan 980 Lightweight Tee', price: 2700, estimatedCost: 1050 },  // $7 × 150
            { id: 36, name: 'Gildan 2000 Ultra Cotton Tee', price: 2800, estimatedCost: 1200 },  // $8 × 150
            { id: 145, name: 'Gildan 64000 Softstyle T-Shirt', price: 2700, estimatedCost: 1050 },  // $7 × 150
            { id: 157, name: 'Gildan 5000B Kids Tee', price: 2200, estimatedCost: 750 },  // $5 × 150
            { id: 80, name: 'Gildan 2400 Long Sleeve Tee', price: 3200, estimatedCost: 1350 },  // $9 × 150
            { id: 49, name: 'Gildan 18000 Sweatshirt', price: 4000, estimatedCost: 2100 },  // $14 × 150
            { id: 77, name: 'Gildan 18500 Hoodie', price: 4500, estimatedCost: 2550 }  // $17 × 150
        ];

        const results = [];

        for (const blueprint of blueprints) {
            try {
                // Get variants with pricing
                const response = await fetch(
                    `https://api.printify.com/v1/catalog/blueprints/${blueprint.id}/print_providers/${printProviderId}/variants.json`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!response.ok) {
                    results.push({
                        ...blueprint,
                        error: `API error: ${response.status}`
                    });
                    continue;
                }

                const data = await response.json();
                const variants = data.variants || [];

                if (variants.length === 0) {
                    results.push({
                        ...blueprint,
                        error: 'No variants found'
                    });
                    continue;
                }

                // Use estimated cost (API doesn't return cost in variants endpoint)
                const baseCost = blueprint.estimatedCost;
                const profit = blueprint.price - baseCost;
                const profitMargin = ((profit / blueprint.price) * 100).toFixed(1);

                results.push({
                    name: blueprint.name,
                    blueprintId: blueprint.id,
                    sellingPrice: `¥${blueprint.price.toLocaleString()}`,
                    baseCost: `¥${baseCost.toLocaleString()}`,
                    profit: `¥${profit.toLocaleString()}`,
                    profitMargin: `${profitMargin}%`,
                    meetsTarget: parseFloat(profitMargin) >= 38,
                    note: parseFloat(profitMargin) >= 38 ? '✅ 利益率38%以上' : '⚠️ 利益率38%未満'
                });

            } catch (error) {
                results.push({
                    ...blueprint,
                    error: error.message
                });
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        res.status(200).json({
            success: true,
            targetMargin: '38%',
            results: results,
            summary: {
                total: results.length,
                meetingTarget: results.filter(r => r.meetsTarget).length,
                belowTarget: results.filter(r => !r.meetsTarget && !r.error).length
            }
        });

    } catch (error) {
        console.error('Error checking prices:', error);
        res.status(500).json({ error: error.message });
    }
}
