// Gelato API接続テスト
import { asyncHandler, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['GELATO_API_KEY']);

    const apiKey = process.env.GELATO_API_KEY;

    try {
        console.log('🔍 Gelato API接続テスト開始...');

        // Test API connection by fetching catalogs
        const response = await fetch('https://product.gelatoapis.com/v3/catalogs', {
            method: 'GET',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Gelato API接続失敗:', response.status, errorText);
            return res.status(response.status).json({
                success: false,
                error: `Gelato API Error (${response.status})`,
                details: errorText
            });
        }

        const data = await response.json();
        console.log('✅ Gelato API接続成功');

        res.status(200).json({
            success: true,
            message: 'Gelato API接続成功',
            catalogsCount: data.catalogs ? data.catalogs.length : 0,
            apiVersion: 'v3',
            connected: true
        });

    } catch (error) {
        console.error('❌ Gelato API接続エラー:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

export default asyncHandler(handler);
