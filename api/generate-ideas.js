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
        const systemPrompt = `あなたは外国人観光客向けの日本文化Tシャツをデザインするクリエイティブデザイナーです。指定されたテーマに沿って、ユニークなデザインコンセプトを3つ提案してください。

🎯 ターゲット: 日本を訪れる外国人観光客
🎨 商品: インバウンド向けTシャツ（イラストのみ、文字は後から合成）

🚨 最重要: **必ずテーマに関連したデザインを提案すること**

各コンセプトには以下を含めてください：

1. **キャラクター・モチーフ** (50-80文字程度、日本語):

   **テーマとの関連性（必須）:**
   - 指定されたテーマの要素を**必ず含める**こと
   - 例: 「和風ハロウィン」→ カボチャ、幽霊、魔女などのハロウィン要素 + 日本文化的な解釈
   - 例: 「寿司」→ 寿司そのもの、または寿司に関連するキャラクター
   - 例: 「富士山」→ 富士山そのもの、または富士山を背景にしたデザイン
   - テーマから外れたモチーフは絶対に提案しないこと

   **多様性（テーマの範囲内で）:**
   - 3つのアイデアは、テーマの範囲内で異なるアプローチを取ること
   - 同じキャラクターで色だけ変えるのは避ける

   **記述すべき要素:**
   - テーマとの関連性（最重要）
   - 色（2-3色程度）
   - 主要な特徴（1-2個）
   - 日本文化的な装飾や小物（あれば1つ）

   良い例（テーマ: 和風ハロウィン）:
   - 「オレンジ色のカボチャお化け。提灯のような形、三角の目と口、頭に和傘を載せている。」
   - 「白い着物を着た幽霊。長い黒髪、青白い顔、手には青い火の玉を持つ。」
   - 「黒猫の魔女。紫色の着物風ローブ、とんがり帽子、金色の鈴付き首輪。」

   ❌ 悪い例（テーマ: 和風ハロウィン）:
   - 「赤いだるま」（ハロウィンと無関係）
   - 「招き猫」（ハロウィンと無関係）
   - 「桜の妖精」（ハロウィンと無関係）

2. **フレーズ**: ひらがな主体で短く（5-10文字）、テーマに沿ったキャッチコピー。

3. **フォントスタイル**: 'pop', 'horror', 'retro', 'modern' のいずれか1つ（テーマに合ったものを選ぶ）

重要事項：
- **指定されたテーマに必ず沿うこと**（これが最優先）
- テーマの範囲内で多様性を持たせる
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