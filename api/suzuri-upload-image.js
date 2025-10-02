// SUZURI API - 画像アップロード（Material作成）
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateRequired, validateEnv, ExternalAPIError } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['SUZURI_ACCESS_TOKEN']);
    validateRequired(req.body, ['imageUrl', 'title']);

    const { imageUrl, title } = req.body;
    const accessToken = process.env.SUZURI_ACCESS_TOKEN;

    try {
        console.log(`📤 SUZURI画像アップロード: ${title}`);

        // SUZURI API - Create Material (image-based)
        const response = await fetch('https://suzuri.jp/api/v1/materials', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                texture: imageUrl,
                title: title
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new ExternalAPIError('SUZURI', `Failed to upload image (${response.status})`, errorText);
        }

        const result = await response.json();
        console.log(`✅ SUZURI Material作成成功: ID ${result.id}`);

        res.status(200).json({
            success: true,
            materialId: result.id,
            material: result,
            message: 'SUZURIに画像をアップロードしました'
        });

    } catch (error) {
        console.error('❌ SUZURI画像アップロードエラー:', error);
        throw error;
    }
}

// レート制限: 10リクエスト/分
export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 10, windowMs: 60000 }
);
