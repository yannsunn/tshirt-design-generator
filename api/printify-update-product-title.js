// Printify商品のタイトルを更新
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateRequired, validateEnv } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['PRINTIFY_API_KEY']);
    validateRequired(req.body, ['shopId', 'productId', 'newTitle']);

    const { shopId, productId, newTitle } = req.body;
    const apiKey = process.env.PRINTIFY_API_KEY;

    // タイトル長チェック
    if (newTitle.length > 80) {
        return res.status(400).json({
            error: 'Title too long',
            message: `Title must be 80 characters or less (current: ${newTitle.length})`,
            newTitle: newTitle
        });
    }

    try {
        console.log(`🔧 商品タイトル更新: ${productId}`);
        console.log(`   新タイトル: ${newTitle} (${newTitle.length}文字)`);

        // 商品詳細を取得
        const getResponse = await fetch(
            `https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!getResponse.ok) {
            const errorText = await getResponse.text();
            return res.status(getResponse.status).json({
                error: 'Failed to fetch product',
                details: errorText
            });
        }

        const product = await getResponse.json();

        // タイトルのみを更新（他のフィールドはそのまま）
        const updateResponse = await fetch(
            `https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: newTitle
                })
            }
        );

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            return res.status(updateResponse.status).json({
                error: 'Failed to update title',
                details: errorText
            });
        }

        const updatedProduct = await updateResponse.json();

        console.log(`✅ タイトル更新成功`);
        console.log(`   旧: ${product.title} (${product.title.length}文字)`);
        console.log(`   新: ${updatedProduct.title} (${updatedProduct.title.length}文字)`);

        res.status(200).json({
            success: true,
            productId: productId,
            oldTitle: product.title,
            newTitle: updatedProduct.title,
            oldLength: product.title.length,
            newLength: updatedProduct.title.length
        });

    } catch (error) {
        console.error('❌ タイトル更新エラー:', error);
        throw error;
    }
}

export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 10, windowMs: 60000 }
);
