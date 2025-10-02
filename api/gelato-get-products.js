// Gelato商品カタログ取得API
import { asyncHandler, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['GELATO_API_KEY']);

    const apiKey = process.env.GELATO_API_KEY;

    try {
        console.log('📦 Gelato商品カタログ取得開始...');

        // Get all catalogs
        const catalogsResponse = await fetch('https://product.gelatoapis.com/v3/catalogs', {
            method: 'GET',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!catalogsResponse.ok) {
            const errorText = await catalogsResponse.text();
            console.error('❌ Gelato商品カタログ取得失敗:', catalogsResponse.status, errorText);
            return res.status(catalogsResponse.status).json({
                success: false,
                error: `Gelato API Error (${catalogsResponse.status})`,
                details: errorText
            });
        }

        const catalogsData = await catalogsResponse.json();
        console.log('✅ Gelato商品カタログ取得成功');

        // Get detailed product information for t-shirts
        // Assuming the first catalog contains apparel products
        const defaultCatalog = catalogsData.catalogs && catalogsData.catalogs[0];

        let tshirtProducts = [];

        if (defaultCatalog && defaultCatalog.products) {
            // Filter t-shirt products
            tshirtProducts = defaultCatalog.products.filter(product => {
                const name = product.title?.toLowerCase() || '';
                return name.includes('t-shirt') || name.includes('tee');
            });
        }

        res.status(200).json({
            success: true,
            catalogsCount: catalogsData.catalogs ? catalogsData.catalogs.length : 0,
            catalogs: catalogsData.catalogs,
            tshirtProducts: tshirtProducts,
            message: 'Gelato商品カタログ取得成功'
        });

    } catch (error) {
        console.error('❌ Gelato商品カタログ取得エラー:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

export default asyncHandler(handler);
