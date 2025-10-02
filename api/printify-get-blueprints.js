// Printify API統合 - Blueprint一覧取得（デバッグ用）
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const apiKey = process.env.PRINTIFY_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'PRINTIFY_API_KEY is not configured' });
        }

        // Print Provider 3 (MyLocker) のBlueprintを取得
        const printProviderId = 3;
        const response = await fetch(
            `https://api.printify.com/v1/catalog/print_providers/${printProviderId}.json`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Printify Blueprints API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Gildan製品のみフィルタ
        const gildanBlueprints = data.blueprints?.filter(bp =>
            bp.brand?.toLowerCase().includes('gildan')
        ) || [];

        console.log('📦 Print Provider 3 (MyLocker) - Gildan Blueprints:');
        gildanBlueprints.forEach(bp => {
            console.log(`  - ID: ${bp.id} | ${bp.brand} ${bp.model} | ${bp.title}`);
        });

        res.status(200).json({
            printProvider: data.title || 'MyLocker',
            printProviderId: printProviderId,
            gildanBlueprints: gildanBlueprints,
            allBlueprints: data.blueprints || []
        });

    } catch (error) {
        console.error('Error in /api/printify-get-blueprints:', error);
        res.status(500).json({ error: error.message });
    }
}
