export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { character, api } = req.body;

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

    const prompt = `Create a detailed Japanese-themed t-shirt design illustration of: "${character}".

Style requirements:
- Vibrant, eye-catching colors suitable for t-shirts
- Japanese cultural aesthetic (anime/manga inspired or traditional art style)
- Character should fill most of the frame and be centered
- TRANSPARENT BACKGROUND (no background, PNG with alpha channel)
- High contrast and bold details for the character itself
- Professional quality suitable for print-on-demand
- Clear edges and well-defined silhouette

CRITICAL:
- Do NOT include ANY text, words, letters, or phrases in the image
- Generate ONLY the character/motif illustration
- Background must be completely transparent`;

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
    const prompt = `Create a detailed Japanese-themed t-shirt design illustration of: "${character}".

Style requirements:
- Vibrant, eye-catching colors suitable for t-shirts
- Japanese cultural aesthetic (anime/manga inspired or traditional art style)
- Character should fill most of the frame and be centered
- TRANSPARENT BACKGROUND (no background, PNG with alpha channel)
- High contrast and bold details for the character itself
- Professional quality suitable for print-on-demand
- Clear edges and well-defined silhouette
- Centered composition

CRITICAL:
- Do NOT include ANY text, words, letters, or phrases in the image
- Generate ONLY the character/motif illustration
- Background must be completely transparent`;

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

    if (result.candidates && result.candidates[0]?.content?.parts[0]?.inlineData) {
        const base64 = result.candidates[0].content.parts[0].inlineData.data;
        const mimeType = result.candidates[0].content.parts[0].inlineData.mimeType || 'image/jpeg';
        return res.status(200).json({ image: `data:${mimeType};base64,${base64}` });
    } else {
        throw new Error("画像データが見つかりません");
    }
}