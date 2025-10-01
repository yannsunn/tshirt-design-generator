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
        if (!api || !['seedream', 'gemini'].includes(api)) {
            return res.status(400).json({ error: '無効なAPI選択です' });
        }

        // Geminiをメインに、Seedream 4.0を代替として使用
        if (api === 'seedream') {
            return await generateWithSeedream(character, res);
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

async function generateWithSeedream(character, res) {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'FAL_API_KEY is not configured' });
    }

    // 🔥 Seedream 4.0: Extreme simplicity + negative prompt
    // Seedream 4.0 is optimized for character accuracy
    // Solution: ONLY character description + strong negative prompt

    const prompt = `${character}

Japanese anime style illustration, white background, centered, full body visible, no text or letters.`;

    // Strong negative prompt to prevent wrong generations
    const negativePrompt = "cute anime girl with food, cooking, restaurant, plate, dish, modern clothing, school uniform, cheerful smile, question mark, chef, waitress, different character";

    const response = await fetch('https://fal.run/fal-ai/seedream', {
        method: 'POST',
        headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            negative_prompt: negativePrompt,  // ← ADD negative prompt
            image_size: "square_hd",
            num_inference_steps: 50,
            guidance_scale: 9.0,  // ← INCREASE from 7.5 to 9.0 for STRONGER prompt adherence
            num_images: 1,
            enable_safety_checker: false
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Seedream API error: ${response.status} - ${errorText}`);
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
    // 🔥 CRITICAL FIX v2: Extreme simplicity + explicit negative examples
    // Problem: AI STILL ignoring descriptions and creating random cute girls
    // Solution: ONLY character description + explicit DO NOT instructions

    const prompt = `${character}

Japanese anime style illustration, white background, centered, full body visible, no text or letters.

DO NOT create: cute anime girl with food, cooking scene, restaurant, modern clothing, school uniform, cheerful smile, or any character different from the description above.`;


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