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
        const systemPrompt = `あなたは外国人観光客向けの日本文化Tシャツをデザインするクリエイティブデザイナーです。テーマについて、ユニークで多様性のあるデザインコンセプトを3つ提案してください。

🎯 ターゲット: 日本を訪れる外国人観光客
🎨 商品: インバウンド向けTシャツ（イラストのみ、文字は後から合成）

各コンセプトには以下を含めてください：

1. **キャラクター・モチーフ** (50-80文字程度、日本語):
   - **多様性を重視**: 同じ動物や似たキャラクターを避け、3つのアイデアはすべて異なるモチーフにすること
   - 日本文化を象徴する要素（動物、妖怪、食べ物、文化アイテムなど）
   - 簡潔で明確な描写（色、形、主要な特徴のみ）
   - シンプルでアイコニックなデザインに適した記述

   記述すべき要素：
   - 何のキャラクター/モチーフか（例：「招き猫」「だるま」「鬼」「桜の妖精」）
   - 色（2-3色程度）
   - 主要な特徴（1-2個）
   - 日本文化的な装飾や小物（あれば1つ）

   良い例：
   - 「赤いだるま。丸い体に太い黒い眉毛、金色のひげ。片目だけ黒く塗られている。」
   - 「ピンク色の桜の妖精。花びらの形の羽、優しい笑顔、着物風のドレス。」
   - 「青い鬼のキャラクター。角が2本、大きな口、虎柄のパンツ、金棒を持つ。」

   ❌ 避けるべき例：
   - 長すぎる描写（100文字以上）
   - 複雑すぎる構図
   - 同じテーマで動物だけが違うパターン（例：3つとも動物キャラクター）

2. **フレーズ**: ひらがな主体で短く（5-10文字）、覚えやすいキャッチコピー。

3. **フォントスタイル**: 'pop', 'horror', 'retro', 'modern' のいずれか1つ

重要事項：
- **3つのアイデアは必ず異なるモチーフにすること**（動物、妖怪、食べ物、文化アイテムなど、カテゴリも分散させる）
- characterフィールドは**必ず日本語**で記述
- 50-80文字程度の簡潔な描写
- シンプルでTシャツに映えるアイコニックなデザイン
- 外国人が見て「日本っぽい！」と感じる要素を含める
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