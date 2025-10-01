// Printify Blueprint/Print Providerの利用可能なモックアップを取得
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const apiKey = process.env.PRINTIFY_API_KEY;
        const { blueprintId, printProviderId } = req.query;

        if (!apiKey) {
            return res.status(500).json({ error: 'PRINTIFY_API_KEY is not configured' });
        }

        if (!blueprintId || !printProviderId) {
            return res.status(400).json({ error: 'blueprintId and printProviderId are required' });
        }

        // Print Providerの詳細情報を取得（モックアップIDが含まれる）
        const response = await fetch(
            `https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}.json`,
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
            throw new Error(`Printify API error: ${response.status} - ${errorText}`);
        }

        const providerData = await response.json();

        // 利用可能なモックアップIDを抽出
        const availableMockups = providerData.images || [];

        res.status(200).json({
            mockups: availableMockups,
            count: availableMockups.length
        });

    } catch (error) {
        console.error('Error in /api/printify-get-mockups:', error);
        res.status(500).json({ error: error.message });
    }
}
