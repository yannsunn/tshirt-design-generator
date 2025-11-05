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

    // Simple test response
    res.status(200).json({
      status: 'ok',
      message: 'Simple handler works',
      theme,
      hasApiKey: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('ERROR:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}
