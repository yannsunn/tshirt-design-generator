// Printify商品詳細取得API
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { shopId, productId } = req.query;
    const apiKey = process.env.PRINTIFY_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'PRINTIFY_API_KEY is not configured' });
    }

    if (!shopId || !productId) {
        return res.status(400).json({ error: 'shopId and productId are required' });
    }

    try {
        const response = await fetch(
            `https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`,
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
            throw new Error(`Failed to fetch product: ${response.status} - ${errorText}`);
        }

        const product = await response.json();

        res.status(200).json({
            success: true,
            product
        });

    } catch (error) {
        console.error('❌ Printify商品取得エラー:', error);
        res.status(500).json({ error: error.message });
    }
}
