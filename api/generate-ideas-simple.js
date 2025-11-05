/**
 * Simplified version of generate-ideas without middleware for debugging
 */

export default async function handler(req, res) {
  try {
    console.log('=== Simple handler started ===');
    console.log('Method:', req.method);
    console.log('Body:', JSON.stringify(req.body));

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!req.body || !req.body.theme) {
      return res.status(400).json({ error: 'Theme is required' });
    }

    const { theme } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    console.log('Theme:', theme);
    console.log('API Key exists:', !!apiKey);
    console.log('API Key length:', apiKey.length);

    // Try importing fetchWithTimeout
    const { fetchWithTimeout } = await import('../lib/fetchWithTimeout.js');
    console.log('fetchWithTimeout imported successfully');

    // Try calling Gemini API
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: `テーマ: ${theme}` }] }],
      generationConfig: {
        temperature: 1.0,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              character: { type: "STRING" },
              phrase: { type: "STRING" }
            }
          }
        }
      }
    };

    console.log('Calling Gemini API...');
    const response = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 15000);

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return res.status(500).json({
        error: 'Gemini API failed',
        details: errorText.substring(0, 200)
      });
    }

    const responseText = await response.text();
    const result = JSON.parse(responseText);

    console.log('Gemini API success');

    res.status(200).json({
      status: 'ok',
      message: 'Full flow works',
      theme,
      result: result.candidates?.[0]?.content?.parts?.[0]?.text || 'No result'
    });

  } catch (error) {
    console.error('ERROR:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}
