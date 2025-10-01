export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { character, api } = req.body;

        // 入力バリデーション
        if (!character || typeof character !== 'string') {
            return res.status(400).json({ error: 'キャラクター情報が指定されていません' });
        }
        if (character.length > 1000) {
            return res.status(400).json({ error: 'キャラクター情報が長すぎます' });
        }
        if (!api || !['fal', 'gemini'].includes(api)) {
            return res.status(400).json({ error: '無効なAPI選択です' });
        }

        // FAL AIをメインに、Geminiを代替として使用
        if (api === 'fal') {
            return await generateWithFAL(character, res);
        } else if (api === 'gemini') {
            return await generateWithGemini(character, res);
        } else {
            return res.status(400).json({ error: 'Invalid API selection' });
        }

    } catch (error) {
        console.error('Error in /api/generate-image:', error);
        res.status(500).json({ error: error.message });
    }
}

async function generateWithFAL(character, res) {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'FAL_API_KEY is not configured' });
    }

    const prompt = `Create a t-shirt design illustration for international tourists based on this description: "${character}".

This is for a T-SHIRT PRINT - simple, clean illustration only.

🚨 ABSOLUTELY NO TEXT ALLOWED:
- NO Japanese characters (kanji, hiragana, katakana)
- NO English letters or words
- NO numbers or symbols
- NO text of any kind anywhere in the image
- This is a PURE ILLUSTRATION ONLY - like a logo or icon
- If you see any text forming, STOP and remove it
- The illustration should speak for itself without any words

🚨 FRAMING RULES:
- Character occupies only 55-65% of image area (leave 35-45% as white space)
- Minimum 25-30% white space on ALL FOUR SIDES
- Center the character perfectly
- ZOOM OUT MORE to ensure nothing gets cut off
- Character should look like it's "floating" with generous white space all around
- Better to have too much space than not enough

COMPOSITION CHECKLIST:
✓ Top: white space visible above character
✓ Bottom: white space visible below character
✓ Left: white space visible on left side
✓ Right: white space visible on right side

Style requirements:
- Follow the character description faithfully
- Vibrant colors suitable for t-shirts
- Cute, appealing Japanese aesthetic (anime/manga style or traditional Japanese art)
- Appeal to foreign tourists who love Japanese culture
- SOLID PURE WHITE BACKGROUND (#FFFFFF) - no gradients, no shadows
- High contrast and clear edges
- Professional print-on-demand quality

REMEMBER:
- This is for an international audience
- Simple, iconic illustration that represents Japanese culture
- NO TEXT - illustration only
- Clean, commercial t-shirt design`;

    const response = await fetch('https://fal.run/fal-ai/flux/dev', {
        method: 'POST',
        headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            image_size: "portrait_16_9",  // 縦長のTシャツデザインに適したサイズ
            num_inference_steps: 28,
            guidance_scale: 3.5,
            num_images: 1,
            enable_safety_checker: false  // 日本文化要素が誤検知されないように
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FAL AI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (result.images && result.images[0]?.url) {
        const imageUrl = result.images[0].url;
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(imageBuffer).toString('base64');
        return res.status(200).json({ image: `data:image/png;base64,${base64}` });
    } else {
        throw new Error("画像データが見つかりません");
    }
}

async function generateWithGemini(character, res) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
    const prompt = `Create a t-shirt design illustration for international tourists based on this description: "${character}".

This is for a T-SHIRT PRINT - simple, clean illustration only.

🚨 ABSOLUTELY NO TEXT ALLOWED:
- NO Japanese characters (kanji, hiragana, katakana)
- NO English letters or words
- NO numbers or symbols
- NO text of any kind anywhere in the image
- This is a PURE ILLUSTRATION ONLY - like a logo or icon
- If you see any text forming, STOP and remove it
- The illustration should speak for itself without any words

🚨 FRAMING RULES:
- Character occupies only 55-65% of image area (leave 35-45% as white space)
- Minimum 25-30% white space on ALL FOUR SIDES
- Center the character perfectly
- ZOOM OUT MORE to ensure nothing gets cut off
- Character should look like it's "floating" with generous white space all around
- Better to have too much space than not enough

COMPOSITION CHECKLIST:
✓ Top: white space visible above character
✓ Bottom: white space visible below character
✓ Left: white space visible on left side
✓ Right: white space visible on right side

Style requirements:
- Follow the character description faithfully
- Vibrant colors suitable for t-shirts
- Cute, appealing Japanese aesthetic (anime/manga style or traditional Japanese art)
- Appeal to foreign tourists who love Japanese culture
- SOLID PURE WHITE BACKGROUND (#FFFFFF) - no gradients, no shadows
- High contrast and clear edges
- Professional print-on-demand quality

REMEMBER:
- This is for an international audience
- Simple, iconic illustration that represents Japanese culture
- NO TEXT - illustration only
- Clean, commercial t-shirt design`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 1.0,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
        }
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini Image API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // デバッグ: レスポンス構造をログ出力
    console.log('Gemini Image API response structure:', JSON.stringify({
        hasCandidates: !!result.candidates,
        candidatesLength: result.candidates?.length,
        firstCandidate: result.candidates?.[0] ? {
            hasContent: !!result.candidates[0].content,
            partsLength: result.candidates[0].content?.parts?.length,
            firstPartKeys: result.candidates[0].content?.parts?.[0] ? Object.keys(result.candidates[0].content.parts[0]) : []
        } : null
    }, null, 2));

    if (result.candidates && result.candidates[0]?.content?.parts) {
        const parts = result.candidates[0].content.parts;

        // inlineDataを探す
        for (const part of parts) {
            if (part.inlineData) {
                const base64 = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || 'image/jpeg';
                return res.status(200).json({ image: `data:${mimeType};base64,${base64}` });
            }
        }
    }

    // エラー時は詳細情報を含める
    console.error('Gemini Image API - No image data found. Full response:', JSON.stringify(result, null, 2));
    throw new Error(`画像データが見つかりません。API Response: ${JSON.stringify(result?.candidates?.[0]?.content?.parts || result?.error || 'Unknown error')}`);
}