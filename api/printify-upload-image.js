// Printify に画像をアップロード
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { imageData, fileName } = req.body; // Base64形式の画像データ
        const apiKey = process.env.PRINTIFY_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'PRINTIFY_API_KEY is not configured' });
        }

        // Base64データを抽出
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

        // Validate base64 data
        if (!base64Data || base64Data.length === 0) {
            throw new Error('Invalid image data: empty or malformed base64 string');
        }

        console.log(`Uploading image: ${fileName}, size: ${base64Data.length} characters`);

        // Printify画像アップロードAPI
        const response = await fetch('https://api.printify.com/v1/uploads/images.json', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_name: fileName || 'tshirt-design.png',
                contents: base64Data
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Printify Image Upload error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log(`Image uploaded successfully: ID=${result.id}`);

        res.status(200).json({
            imageId: result.id,
            imageUrl: result.file_name,
            message: '画像のアップロードに成功しました'
        });

    } catch (error) {
        console.error('Error in /api/printify-upload-image:', error);
        res.status(500).json({ error: error.message });
    }
}