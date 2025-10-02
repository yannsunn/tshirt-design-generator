// 全プラットフォーム一括出品API
// Printify, SUZURI, BASEに同時に出品

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { imageData, title, description, theme } = req.body;

    if (!imageData || !title) {
        return res.status(400).json({ error: 'imageData and title are required' });
    }

    const results = {
        printify: { success: false, error: null, data: null },
        suzuri: { success: false, error: null, data: null },
        base: { success: false, error: null, data: null }
    };

    try {
        // 1. Printify出品
        console.log('📦 Printify出品開始...');
        try {
            const printifyResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/printify-batch-auto-generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageData,
                    title,
                    description,
                    theme
                })
            });

            if (printifyResponse.ok) {
                const printifyData = await printifyResponse.json();
                results.printify.success = true;
                results.printify.data = printifyData;
                console.log('✅ Printify出品成功');
            } else {
                const errorData = await printifyResponse.json();
                results.printify.error = errorData.error || 'Printify出品失敗';
                console.log('❌ Printify出品失敗:', results.printify.error);
            }
        } catch (error) {
            results.printify.error = error.message;
            console.log('❌ Printify出品エラー:', error.message);
        }

        // 2. SUZURI出品
        console.log('🎨 SUZURI出品開始...');
        try {
            const suzuriResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/suzuri-batch-create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: imageData,
                    title,
                    description
                })
            });

            if (suzuriResponse.ok) {
                const suzuriData = await suzuriResponse.json();
                results.suzuri.success = true;
                results.suzuri.data = suzuriData;
                console.log('✅ SUZURI出品成功');
            } else {
                const errorData = await suzuriResponse.json();
                results.suzuri.error = errorData.error || 'SUZURI出品失敗';
                console.log('❌ SUZURI出品失敗:', results.suzuri.error);
            }
        } catch (error) {
            results.suzuri.error = error.message;
            console.log('❌ SUZURI出品エラー:', error.message);
        }

        // 3. BASE出品
        console.log('🛒 BASE出品開始...');
        try {
            const baseResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/base-create-product`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: imageData,
                    title,
                    detail: description,
                    price: 2500
                })
            });

            if (baseResponse.ok) {
                const baseData = await baseResponse.json();
                results.base.success = true;
                results.base.data = baseData;
                console.log('✅ BASE出品成功');
            } else {
                const errorData = await baseResponse.json();
                results.base.error = errorData.error || 'BASE出品失敗';
                console.log('❌ BASE出品失敗:', results.base.error);
            }
        } catch (error) {
            results.base.error = error.message;
            console.log('❌ BASE出品エラー:', error.message);
        }

        // 結果集計
        const successCount = Object.values(results).filter(r => r.success).length;
        const totalCount = Object.keys(results).length;

        return res.status(200).json({
            success: successCount > 0,
            message: `${successCount}/${totalCount}プラットフォームに出品成功`,
            results,
            summary: {
                total: totalCount,
                successful: successCount,
                failed: totalCount - successCount
            }
        });

    } catch (error) {
        console.error('❌ 一括出品エラー:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            results
        });
    }
}
