export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { theme } = req.body;

        // 入力バリデーション
        if (!theme || typeof theme !== 'string') {
            return res.status(400).json({ error: 'テーマが指定されていません' });
        }
        if (theme.length > 200) {
            return res.status(400).json({ error: 'テーマが長すぎます（最大200文字）' });
        }
        if (theme.trim().length === 0) {
            return res.status(400).json({ error: 'テーマを入力してください' });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
        const systemPrompt = `あなたは海外の顧客に向けた日本文化Tシャツをデザインするクリエイティブデザイナーです。テーマについて、ユニークでキャッチーなデザインコンセプトを3つ提案してください。

各コンセプトには以下を含めてください：
1. **キャラクター・モチーフ**: 日本語で詳細に描写すること。色、形、特徴、雰囲気、日本文化的要素を具体的に記述。例：「赤い提灯の形をした可愛らしいお化け、大きな黒い目と小さな口、ほんのり光る黄色の明かりが内側から漏れている、周りには薄紫色の霧が漂う」
2. **フレーズ**: 必ず『ひらがな』を主体とすること（カタカナは最小限）。短く覚えやすいキャッチコピー。
3. **フォントスタイル**: 'pop', 'horror', 'retro', 'modern' のいずれか1つ

重要事項：
- characterフィールドは**必ず日本語**で記述すること
- AI画像生成に使用されるため、視覚的な詳細（色、形、質感、雰囲気）を豊富に含めること
- 英語は一切使用しないこと`;


        const payload = {
            contents: [{ parts: [{ text: `テーマ: ${theme}` }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            character: { type: "STRING" },
                            phrase: { type: "STRING" },
                            fontStyle: { type: "STRING" }
                        },
                        required: ["character", "phrase", "fontStyle"]
                    }
                }
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
        const ideas = JSON.parse(result.candidates[0].content.parts[0].text);
        res.status(200).json({ ideas });

    } catch (error) {
        console.error('Error in /api/generate-ideas:', error);
        res.status(500).json({ error: error.message });
    }
}