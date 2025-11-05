import { asyncHandler } from '../lib/errorHandler.js';
import { rateLimitMiddleware } from '../lib/rateLimiter.js';

async function handler(req, res) {
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
        const isProd = process.env.NODE_ENV === 'production';
        res.status(500).json({
            error: isProd ? 'Internal server error' : error.message
        });
    }
}

async function generateWithSeedream(character, res) {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'FAL_API_KEY is not configured' });
    }

    // 🔥 Seedream 4.0: Bold dramatic style for maximum variation
    // Add unique style variations each time

    const styleVariations = [
        'dynamic angle, dramatic lighting',
        'close-up composition, intense expression',
        'wide angle, full scene view',
        'artistic perspective, unique pose',
        'cinematic composition, vibrant colors'
    ];
    const randomStyle = styleVariations[Math.floor(Math.random() * styleVariations.length)];

    const prompt = `${character}

Japanese anime style illustration, ${randomStyle}, white background, centered, full body visible, no text or letters.`;

    // Strong negative prompt to prevent wrong generations
    const negativePrompt = "cute anime girl with food, cooking, restaurant, plate, dish, modern clothing, school uniform, cheerful smile, question mark, chef, waitress, different character";

    // Generate unique seed using timestamp + random for maximum variation
    const uniqueSeed = Math.floor(Date.now() * Math.random()) % 1000000;

    const controller1 = new AbortController();
    const timeout1 = setTimeout(() => controller1.abort(), 30000); // 30秒（画像生成は時間がかかる）

    const response = await fetch('https://fal.run/fal-ai/bytedance/seedream/v4/text-to-image', {
        method: 'POST',
        headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            negative_prompt: negativePrompt,
            image_size: "square_hd",
            num_inference_steps: 50,
            guidance_scale: 7.5,  // Lower from 9.0 to 7.5 for more variation
            seed: uniqueSeed,
            num_images: 1,
            enable_safety_checker: false
        }),
        signal: controller1.signal
    });
    clearTimeout(timeout1);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Seedream API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (result.images && result.images[0]?.url) {
        const imageUrl = result.images[0].url;
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 10000);

        const imageResponse = await fetch(imageUrl, { signal: controller2.signal });
        clearTimeout(timeout2);

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

    // 🔥 Gemini: Detailed artistic style for maximum variation
    // Add unique style variations each time

    const styleVariations = [
        'highly detailed, soft lighting, elegant composition',
        'bold colors, dramatic shadows, artistic angle',
        'painterly style, rich textures, unique perspective',
        'clean linework, vibrant palette, dynamic pose',
        'atmospheric lighting, detailed background elements, expressive'
    ];
    const randomStyle = styleVariations[Math.floor(Math.random() * styleVariations.length)];

    const prompt = `${character}

Japanese anime style illustration, ${randomStyle}, white background, centered, full body visible, no text or letters.

DO NOT create: cute anime girl with food, cooking scene, restaurant, modern clothing, school uniform, cheerful smile, or any character different from the description above.`;


    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 1.5,  // ← INCREASE from 1.3 to 1.5 for maximum variation
            topK: 60,  // ← INCREASE from 40 to 60 for more diversity
            topP: 0.98,  // ← INCREASE from 0.95 to 0.98 for more randomness
            maxOutputTokens: 8192,
        }
    };

    const controller3 = new AbortController();
    const timeout3 = setTimeout(() => controller3.abort(), 30000); // 30秒（画像生成は時間がかかる）

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller3.signal
    });
    clearTimeout(timeout3);

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
// Apply rate limiting: 15 requests per minute per client (image generation is resource-intensive)
export default rateLimitMiddleware(asyncHandler(handler), {
    maxRequests: 15,
    windowMs: 60000
});
