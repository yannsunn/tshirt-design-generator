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
1. **キャラクター・モチーフ**: 日本語で非常に詳細に描写すること。AI画像生成で正確に再現されるよう、以下の要素をすべて含めて記述してください：

   必須記述要素：
   - **全体の構図**: キャラクター全体が見える完全な姿（例：「正面から見た全身の姿」「体全体が収まった構図」）
   - **サイズと比率**: 各パーツの大きさの関係（例：「大きな頭と小さな体」「長い耳が体の2倍の高さ」）
   - **頭部の詳細**: 顔、目、口、耳、髪型など（例：「丸い顔に大きな黒い瞳、小さな三角の口」）
   - **体の詳細**: 胴体、手足の形と配置（例：「丸い胴体、短い手足が左右に伸びている」）
   - **色彩**: すべてのパーツの具体的な色（例：「明るい赤色の体、黄色い目、白い手袋」）
   - **質感と雰囲気**: 表面の質感や全体の雰囲気（例：「ふわふわした毛並み」「つやつやした光沢」）
   - **装飾や小物**: 持ち物や装飾品（例：「右手に青い扇子を持つ」「頭に桜の花びらが1枚」）
   - **日本文化要素**: 具体的な文化的モチーフ（例：「着物の柄」「浮世絵風のタッチ」）

   良い例：「丸々とした白い猫の全身像。体長より大きな丸い頭、大きな黒い瞳と小さなピンクの鼻、短い手足が胴体から生えている。右前足で金色の小判を抱え、左前足は挙手している。赤い首輪に金の鈴。体は真っ白で、つるつるとした陶器のような質感。周りに金色の小判が数枚浮かんでいる。」

2. **フレーズ**: 必ず『ひらがな』を主体とすること（カタカナは最小限）。短く覚えやすいキャッチコピー。
3. **フォントスタイル**: 'pop', 'horror', 'retro', 'modern' のいずれか1つ

重要事項：
- characterフィールドは**必ず日本語**で記述すること
- AI画像生成で「途切れる」「欠ける」ことがないよう、キャラクター全体の完全な姿を明確に記述すること
- 各パーツの位置関係とサイズ比率を具体的に記述すること
- 最低でも100文字以上の詳細な描写を行うこと
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