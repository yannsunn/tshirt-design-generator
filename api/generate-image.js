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

    const prompt = `⚠️⚠️⚠️ CRITICAL INSTRUCTION ⚠️⚠️⚠️

YOU MUST CREATE EXACTLY THIS CHARACTER - DO NOT CREATE ANYTHING ELSE:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 MANDATORY CHARACTER DESCRIPTION:
"${character}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 ABSOLUTE REQUIREMENTS (SCORE: 99/100 PRIORITY):

1. CHARACTER IDENTITY - MOST CRITICAL:
   ✓ Read the description 3 times before starting
   ✓ Create the EXACT character/animal/object mentioned
   ✓ If it says "frog" → MUST be a frog, NOT a girl, NOT a cat, NOT anything else
   ✓ If it says "wearing kimono" → MUST wear kimono
   ✓ If it says "holding umbrella" → MUST hold umbrella

   ❌ FORBIDDEN:
   - Substituting character type (e.g., frog → human)
   - Ignoring any part of the description
   - Adding elements not in description
   - Creating a different character

2. EVERY DETAIL MUST MATCH:
   ✓ Body color: EXACT match to description
   ✓ Clothing: EXACT match to description
   ✓ Accessories: Include ALL mentioned items
   ✓ Eyes: Match size, shape, color from description
   ✓ Mouth: Match description
   ✓ Background elements: Include if mentioned

3. COMPOSITION (to prevent cropping):
   ✓ Character size: 40-45% of image center
   ✓ White space: MINIMUM 40% on all sides
   ✓ Position: Perfectly centered
   ✓ Visibility: FULL character visible (head to toe)
   ✓ Zoom: ZOOM OUT to ensure no cropping
   ✓ Background: SOLID WHITE (#FFFFFF)

4. STYLE:
   ✓ Cute Japanese anime/manga aesthetic
   ✓ Vibrant colors for t-shirt printing
   ✓ Clean, professional illustration
   ✓ NO TEXT (no Japanese, English, or any letters)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ BEFORE YOU START - VERIFY:
1. Read character description above 3 times
2. Identify the main character type (animal/object/person)
3. List all colors mentioned
4. List all accessories/clothing mentioned
5. ONLY THEN start creating the image
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REMINDER: Create ONLY the character described above.
Character description: "${character}"

DO NOT create anything different. ACCURACY IS EVERYTHING.`;

    const response = await fetch('https://fal.run/fal-ai/flux/dev', {
        method: 'POST',
        headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            image_size: "square_hd",  // 正方形で余裕のある構図
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
    const prompt = `⚠️⚠️⚠️ CRITICAL INSTRUCTION ⚠️⚠️⚠️

YOU MUST CREATE EXACTLY THIS CHARACTER - DO NOT CREATE ANYTHING ELSE:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 MANDATORY CHARACTER DESCRIPTION:
"${character}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 ABSOLUTE REQUIREMENTS (SCORE: 99/100 PRIORITY):

1. CHARACTER IDENTITY - MOST CRITICAL:
   ✓ Read the description 3 times before starting
   ✓ Create the EXACT character/animal/object mentioned
   ✓ If it says "frog" → MUST be a frog, NOT a girl, NOT a cat, NOT anything else
   ✓ If it says "wearing kimono" → MUST wear kimono
   ✓ If it says "holding umbrella" → MUST hold umbrella

   ❌ FORBIDDEN:
   - Substituting character type (e.g., frog → human)
   - Ignoring any part of the description
   - Adding elements not in description
   - Creating a different character

2. EVERY DETAIL MUST MATCH:
   ✓ Body color: EXACT match to description
   ✓ Clothing: EXACT match to description
   ✓ Accessories: Include ALL mentioned items
   ✓ Eyes: Match size, shape, color from description
   ✓ Mouth: Match description
   ✓ Background elements: Include if mentioned

3. COMPOSITION (to prevent cropping):
   ✓ Character size: 40-45% of image center
   ✓ White space: MINIMUM 40% on all sides
   ✓ Position: Perfectly centered
   ✓ Visibility: FULL character visible (head to toe)
   ✓ Zoom: ZOOM OUT to ensure no cropping
   ✓ Background: SOLID WHITE (#FFFFFF)

4. STYLE:
   ✓ Cute Japanese anime/manga aesthetic
   ✓ Vibrant colors for t-shirt printing
   ✓ Clean, professional illustration
   ✓ NO TEXT (no Japanese, English, or any letters)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ BEFORE YOU START - VERIFY:
1. Read character description above 3 times
2. Identify the main character type (animal/object/person)
3. List all colors mentioned
4. List all accessories/clothing mentioned
5. ONLY THEN start creating the image
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REMINDER: Create ONLY the character described above.
Character description: "${character}"

DO NOT create anything different. ACCURACY IS EVERYTHING.`;

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