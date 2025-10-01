// remove.bg APIを使って画像の背景を除去
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { imageData } = req.body; // Base64形式の画像データ
        const apiKey = process.env.REMOVEBG_API_KEY;

        if (!apiKey) {
            // APIキーが設定されていない場合は元の画像をそのまま返す
            return res.status(200).json({
                image: imageData,
                skipped: true,
                message: 'remove.bg API key not configured, using original image'
            });
        }

        // Base64データを抽出
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

        // remove.bg API呼び出し
        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_file_b64: base64Data,
                size: 'auto',
                format: 'png',
                type: 'auto' // 自動検出
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('remove.bg API error:', errorText);

            // エラーの場合は元の画像を返す（フォールバック）
            return res.status(200).json({
                image: imageData,
                skipped: true,
                message: `Background removal failed: ${response.status}`
            });
        }

        // 背景除去済み画像を取得
        const imageBuffer = await response.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');

        res.status(200).json({
            image: `data:image/png;base64,${base64Image}`,
            skipped: false,
            message: 'Background removed successfully'
        });

    } catch (error) {
        console.error('Error in /api/remove-background:', error);

        // エラーの場合は元の画像を返す（フォールバック）
        res.status(200).json({
            image: req.body.imageData,
            skipped: true,
            message: error.message
        });
    }
}
