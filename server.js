import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// API Endpoints

// Generate design ideas using Gemini
app.post('/api/generate-ideas', async (req, res) => {
    try {
        const { theme } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
        const systemPrompt = `あなたは海外の顧客に向けたTシャツをデザインするクリエイティブデザイナーです。テーマについて、ユニークでキャッチーなデザインコンセプトを3つ提案してください。各コンセプトには、「キャラクター・モチーフのアイデア」「フレーズ」「フォントスタイル」を含めてください。フレーズは必ず『ひらがな』を主体とすること。フォントスタイルは 'pop', 'horror', 'retro', 'modern' のいずれか1つのキーワードで提案してください。必ず以下のJSONスキーマに沿った形式で、日本語で回答してください。`;

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
        res.json({ ideas });

    } catch (error) {
        console.error('Error in /api/generate-ideas:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate character image
app.post('/api/generate-image', async (req, res) => {
    try {
        const { character, api } = req.body;

        if (api === 'gemini') {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
            }

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
            const prompt = `Create a cute cartoon vector illustration of: "${character}".

Style requirements:
- Cute, friendly, and appealing design
- Bold outlines and vibrant colors
- Centered composition suitable for t-shirt printing
- Plain single-color background
- No text, words, or letters in the image
- Character should be the main focus

This is for t-shirt design, so make it visually striking and simple.`;

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

            if (result.candidates && result.candidates[0]?.content?.parts[0]?.inlineData) {
                const base64 = result.candidates[0].content.parts[0].inlineData.data;
                const mimeType = result.candidates[0].content.parts[0].inlineData.mimeType || 'image/jpeg';
                res.json({ image: `data:${mimeType};base64,${base64}` });
            } else {
                throw new Error("画像データが見つかりません");
            }

        } else if (api === 'fal') {
            const apiKey = process.env.FAL_API_KEY;
            if (!apiKey) {
                return res.status(500).json({ error: 'FAL_API_KEY is not configured' });
            }

            const prompt = `A cute cartoon vector illustration of: "${character}". The graphic is for a t-shirt. Use a plain, single-color background. CRITICAL: Do NOT include any text, words, or letters. Generate only the character.`;

            const response = await fetch('https://fal.run/fal-ai/flux/dev', {
                method: 'POST',
                headers: {
                    'Authorization': `Key ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    image_size: "landscape_4_3",
                    num_inference_steps: 28,
                    guidance_scale: 3.5,
                    num_images: 1
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
                res.json({ image: `data:image/png;base64,${base64}` });
            } else {
                throw new Error("画像データが見つかりません");
            }
        } else {
            res.status(400).json({ error: 'Invalid API selection' });
        }

    } catch (error) {
        console.error('Error in /api/generate-image:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate SNS post
app.post('/api/generate-sns', async (req, res) => {
    try {
        const { idea } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
        const prompt = `以下のTシャツデザインについて、InstagramやX（旧Twitter）で使える魅力的な投稿文を日本語で作成してください。

デザイン情報:
- モチーフ: ${idea.character}
- フレーズ: ${idea.phrase}
- スタイル: ${idea.fontStyle}

要件:
1. 2-3文の簡潔な説明
2. 3-5個の関連ハッシュタグ
3. 商品の魅力が伝わる内容
4. 絵文字を適度に使用

投稿文のみを出力してください。`;

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
        res.json({ snsPost });

    } catch (error) {
        console.error('Error in /api/generate-sns:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        geminiConfigured: !!process.env.GEMINI_API_KEY,
        falConfigured: !!process.env.FAL_API_KEY
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 サーバーが起動しました: http://localhost:${PORT}`);
    console.log(`📝 Gemini API: ${process.env.GEMINI_API_KEY ? '設定済み ✓' : '未設定 ✗'}`);
    console.log(`📝 FAL API: ${process.env.FAL_API_KEY ? '設定済み ✓' : '未設定 ✗'}`);
});