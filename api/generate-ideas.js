import { getSupabaseClient } from '../lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { theme, productTypes = ['tshirt'] } = req.body;

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

        // 過去のアイデア履歴を取得（重複防止）
        // 選択された商品タイプのみで重複チェック
        const supabase = getSupabaseClient();
        let previousIdeas = [];
        let duplicateAvoidanceText = '';

        if (supabase) {
            try {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                // 選択された商品タイプのアイデアのみ取得
                const { data, error } = await supabase
                    .from('design_ideas')
                    .select('character, phrase, product_type')
                    .gte('created_at', thirtyDaysAgo.toISOString())
                    .in('product_type', productTypes)  // 選択されたタイプのみ
                    .order('created_at', { ascending: false })
                    .limit(100);

                if (!error && data && data.length > 0) {
                    previousIdeas = data;

                    // フレーズのリストを作成
                    const usedPhrases = [...new Set(data.map(d => d.phrase))];
                    const usedCharacterKeywords = data.map(d => {
                        // キャラクター説明から主要なキーワードを抽出（最初の20文字程度）
                        return d.character.substring(0, 30);
                    });

                    duplicateAvoidanceText = `

🚨 重複回避（超重要）:
以下のフレーズは過去に使用されているため、**絶対に使用しないでください**:
${usedPhrases.slice(0, 20).map(p => `- "${p}"`).join('\n')}

以下のキャラクター・モチーフは過去に使用されているため、**できるだけ避けてください**:
${usedCharacterKeywords.slice(0, 15).map(k => `- ${k}...`).join('\n')}

必ず新しいフレーズと異なるキャラクター・モチーフを提案してください。`;

                    console.log(`📖 過去のアイデア ${data.length}件を取得し、重複回避を指示`);
                }
            } catch (historyError) {
                console.warn('履歴取得エラー（スキップ）:', historyError.message);
            }
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
        const systemPrompt = `あなたは外国人観光客向けの日本文化Tシャツをデザインするクリエイティブデザイナーです。指定されたテーマに沿って、ユニークなデザインコンセプトを4つ提案してください。

🎯 ターゲット: 日本を訪れる外国人観光客
🎨 商品: インバウンド向けTシャツ（イラストのみ、文字は後から合成）

🚨 最重要: **必ずテーマに関連したデザインを提案すること**

🌟 **バリエーション要件（超重要）:**
- **4つのアイデアは互いに大きく異なる必要があります**
- 同じようなキャラクター、同じような色、同じような構図を避けること
- 異なる角度、異なるスタイル、異なる雰囲気を追求すること
- フレーズも多様性を持たせ、重複や類似を避けること
- 例: 可愛い系、かっこいい系、ホラー系、レトロ系など、異なるテイストを混ぜる

各コンセプトには以下を含めてください：

1. **キャラクター・モチーフ** (80-150文字、日本語で具体的かつ詳細に):

   🚨 **最重要**: AI画像生成で正確に再現されるよう、**非常に具体的で詳細な記述**をすること

   **必須記述要素（すべて含めること）:**
   a. **何のキャラクター/モチーフか**を最初に明記
      - 例: 「提灯お化けのジャックオーランタン」「幽霊」「魔女猫」

   b. **主要な特徴**（形、サイズ、構造）
      - 例: 「提灯のような丸い形」「長い黒髪」「大きな尖った帽子」

   c. **色**（すべてのパーツの色を明記）
      - 例: 「オレンジ色の体」「黒い三角の目」「金色の鈴」

   d. **顔・表情**（目、口、耳など）
      - 例: 「一つ目」「ギザギザの口」「大きな黒い瞳」

   e. **装飾・小物**（日本文化要素を含む）
      - 例: 「頭に小さな鳥居」「着物風のローブ」「金色の鈴付き首輪」

   f. **テーマとの関連性**を明確に
      - テーマから外れたモチーフは絶対に提案しないこと

   ✅ 良い例（テーマ: 和風ハロウィン）:
   - 「提灯お化けのジャックオーランタン。オレンジ色で提灯のような丸い形。一つ目で大きく、ギザギザの口。頭に小さな赤い鳥居を乗せている。周りにオレンジ色の光が漏れている。」（86文字）
   - 「白い着物を着た幽霊。長い黒髪が顔を半分隠す。青白い顔、閉じた目、小さな口。両手に青い火の玉を持つ。着物には桜の模様。足元が透けて消えている。」（81文字）

   ❌ 悪い例:
   - 「オレンジ色のカボチャお化け。提灯のような形、三角の目と口、頭に和傘を載せている。」（不十分: 何のお化けか不明確、一つ目と指定されているのに三角の目になっている、鳥居が和傘に変わっている）
   - 「赤いだるま」（テーマと無関係）
   - 「犬のキャラクター」（テーマと無関係）

2. **フレーズ**: すべてひらがなで短く（5-10文字）、テーマに沿ったキャッチコピー。
   - **必ずひらがなのみを使用すること（漢字・カタカナ・英語禁止）**
   - **必ず4つとも異なるフレーズにすること**
   - 重複や類似したフレーズは避けること
   - バリエーション例: 疑問形、命令形、感嘆形、名詞形など

3. **フォントスタイル**: 'pop', 'horror', 'retro', 'modern' のいずれか1つ（テーマに合ったものを選ぶ）
   - **可能な限り4つのアイデアで異なるフォントスタイルを使うこと**

4. **商品説明** (150-250文字、日本語):

   🚨 **重要**: すべての商品タイプ（Tシャツ、パーカー、スウェット等）で使える汎用的な説明文を作成

   **必須要素（すべて含めること）:**
   a. **デザインの特徴**（40-60文字）
      - キャラクター・モチーフの魅力を簡潔に説明
      - 例: "和風ハロウィンの提灯お化けが登場！日本の妖怪スタイルと洋風ハロウィンの融合デザイン。"

   b. **フレーズの意味・メッセージ**（30-50文字）
      - フレーズが持つメッセージや雰囲気を説明
      - 例: "「こころない」のフレーズが、不思議で切ない雰囲気を演出します。"

   c. **着用シーン・用途**（30-50文字）
      - どんな場面で使えるか、誰におすすめか
      - 例: "ハロウィンイベントや日常のカジュアルスタイルにぴったり。個性的なファッションが好きな方に。"

   d. **ハッシュタグ**（5-8個）
      - テーマ、キャラクター、雰囲気に関連するタグ
      - 例: "#和風ハロウィン #お化け #日本文化 #ユニーク #かわいい #個性的 #カジュアル #オリジナルデザイン"

   ✅ 良い例:
   "和風ハロウィンの提灯お化けが登場！日本の妖怪スタイルと洋風ハロウィンの融合デザイン。「こころない」のフレーズが、不思議で切ない雰囲気を演出します。ハロウィンイベントや日常のカジュアルスタイルにぴったり。個性的なファッションが好きな方におすすめです。\n\n#和風ハロウィン #お化け #日本文化 #ユニーク #かわいい #個性的 #カジュアル #オリジナルデザイン"

   ❌ 悪い例:
   - "このTシャツは..." （商品タイプを特定しない）
   - "可愛いです。" （具体性なし）
   - ハッシュタグなし

🚨 重要事項：
1. **指定されたテーマに必ず沿うこと**（最優先）
2. **キャラクター記述は80-150文字で具体的かつ詳細に**
3. **何のキャラクター/モチーフかを最初に明記**すること
4. すべてのパーツの色、形、特徴を明記
5. **4つのアイデアは互いに大きく異なること（色、形、雰囲気、表情など）**
6. characterフィールドは**必ず日本語**で記述
7. **phraseフィールドは必ずすべてひらがなのみ（漢字・カタカナ・英語禁止）**
8. **descriptionフィールドは150-250文字、商品タイプに依存しない汎用的な説明文**
9. AI画像生成が正確に再現できる詳細さを保つ
10. シンプルでTシャツに映えるアイコニックなデザイン
11. 外国人が見て「日本っぽい！」と感じる要素を含める
12. 英語は一切使用しないこと
13. **創造性とバリエーションを最大限に発揮すること**

📝 記述の質が画像生成の精度を決定します。曖昧な記述は避け、具体的で詳細に書いてください。`;


        const payload = {
            contents: [{ parts: [{ text: `テーマ: ${theme}

重要:
1. 4つのアイデアは互いに大きく異なるものにしてください。同じようなキャラクター、色、構図、フレーズを避け、最大限の多様性を追求してください。
2. フレーズは必ずすべてひらがなのみで出力してください（漢字・カタカナ・英語は絶対に使用禁止）。
${duplicateAvoidanceText}` }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                temperature: 1.5,  // ← INCREASE from 1.2 to 1.5 for maximum diversity
                topK: 60,  // ← ADD topK for more diverse sampling
                topP: 0.98,  // ← ADD topP for more randomness
                responseMimeType: "application/json",
                responseSchema: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            character: { type: "STRING" },
                            phrase: { type: "STRING" },
                            fontStyle: { type: "STRING" },
                            description: { type: "STRING" }
                        },
                        required: ["character", "phrase", "fontStyle", "description"]
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
            console.error('Gemini API error response:', errorText);
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const responseText = await response.text();
        let result;

        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse Gemini API response:', responseText);
            throw new Error(`Gemini APIから無効なレスポンスが返されました。レスポンス内容: ${responseText.substring(0, 200)}...`);
        }

        if (!result.candidates || !result.candidates[0]?.content?.parts?.[0]?.text) {
            console.error('Unexpected Gemini API response structure:', JSON.stringify(result, null, 2));
            throw new Error(`Gemini APIから予期しないレスポンス構造が返されました: ${JSON.stringify(result)}`);
        }

        const ideas = JSON.parse(result.candidates[0].content.parts[0].text);
        res.status(200).json({ ideas });

    } catch (error) {
        console.error('Error in /api/generate-ideas:', error);
        res.status(500).json({ error: error.message });
    }
}