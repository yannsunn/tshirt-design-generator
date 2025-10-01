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

    // 🔥 CRITICAL FIX: Simplified, direct prompt for maximum accuracy
    // Problem: Long prompts with warnings dilute the important information
    // Solution: Short, focused prompt with character description at top and bottom
    const prompt = `CREATE THIS EXACT CHARACTER (READ 3 TIMES):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${character}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MANDATORY RULES:
1. Character type from description is SACRED - NEVER substitute
   • Lantern ghost → MUST be lantern ghost (NOT frog, NOT girl)
   • Frog → MUST be frog (NOT human, NOT cat)
   • Maiko → MUST be human female (NOT animal)

2. Match EVERY detail:
   • ALL colors exactly as described
   • ALL accessories exactly as described
   • ALL facial features exactly as described

3. Composition:
   • Character: 40-45% size, perfectly centered
   • Background: solid white (#FFFFFF)
   • Full character visible (not cropped)

4. Style: Cute Japanese anime/manga, vibrant colors, NO text

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFY: Creating "${character}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const response = await fetch('https://fal.run/fal-ai/flux/dev', {
        method: 'POST',
        headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            image_size: "square_hd",  // 正方形1024x1024で余裕のある構図
            num_inference_steps: 50,  // 品質向上: 28 → 50
            guidance_scale: 7.5,      // プロンプト従順度を大幅向上: 3.5 → 7.5
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
    // 🔥 CRITICAL FIX: Simplified, direct prompt for maximum accuracy
    // Problem: Long prompts with warnings dilute the important information
    // Solution: Short, focused prompt with character description at top and bottom
    const prompt = `CREATE THIS EXACT CHARACTER (READ 3 TIMES):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${character}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MANDATORY RULES:
1. Character type from description is SACRED - NEVER substitute
   • Lantern ghost → MUST be lantern ghost (NOT frog, NOT girl)
   • Frog → MUST be frog (NOT human, NOT cat)
   • Maiko → MUST be human female (NOT animal)

2. Match EVERY detail:
   • ALL colors exactly as described
   • ALL accessories exactly as described
   • ALL facial features exactly as described

3. Composition:
   • Character: 40-45% size, perfectly centered
   • Background: solid white (#FFFFFF)
   • Full character visible (not cropped)

4. Style: Cute Japanese anime/manga, vibrant colors, NO text

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFY: Creating "${character}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

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