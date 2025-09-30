export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { idea } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
        const prompt = `以下のTシャツデザインについて、InstagramやX（旧Twitter）で使える魅力的な投稿文を日本語で作成してください。

デザイン情報:
- モチーフ: ${idea.character}
- フレーズ: ${idea.phrase}
- スタイル: ${idea.fontStyle}

要件:
1. 2-3文の簡潔な説明
2. 3-5個の関連ハッシュタグ
3. 商品の魅力が伝わる内容
4. 絵文字を適度に使用

投稿文のみを出力してください。`;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 500
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        const snsPost = result.candidates[0].content.parts[0].text;
        res.status(200).json({ snsPost });

    } catch (error) {
        console.error('Error in /api/generate-sns:', error);
        res.status(500).json({ error: error.message });
    }
}