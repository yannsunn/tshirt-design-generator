// Printify ショップ情報を取得
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const apiKey = process.env.PRINTIFY_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'PRINTIFY_API_KEY is not configured' });
        }

        const response = await fetch('https://api.printify.com/v1/shops.json', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Printify API error: ${response.status} - ${errorText}`);
        }

        const shops = await response.json();
        res.status(200).json({ shops });

    } catch (error) {
        console.error('Error in /api/printify-get-shops:', error);
        res.status(500).json({ error: error.message });
    }
}