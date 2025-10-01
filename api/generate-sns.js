export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { idea } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
        const prompt = `Create an engaging social media post in ENGLISH for this Japanese-themed t-shirt design for Instagram or X (Twitter).

Design Information:
- Motif: ${idea.character}
- Phrase: ${idea.phrase}
- Style: ${idea.fontStyle}

Requirements:
1. Write in English (target audience: international tourists)
2. 2-3 concise sentences describing the design
3. Highlight the Japanese cultural elements
4. Include 5-7 relevant hashtags
5. Use emojis appropriately (🇯🇵 🎨 👕 etc.)
6. Make it appealing to tourists visiting Japan

Format:
[Main text with emojis]

[Hashtags]

Output only the social media post.`;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 500
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
        const snsPost = result.candidates[0].content.parts[0].text;
        res.status(200).json({ snsPost });

    } catch (error) {
        console.error('Error in /api/generate-sns:', error);
        res.status(500).json({ error: error.message });
    }
}