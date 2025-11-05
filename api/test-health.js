/**
 * Simple health check endpoint to test Vercel deployment
 */

export default async function handler(req, res) {
  try {
    const hasApiKey = !!process.env.GEMINI_API_KEY;

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL_ENV || 'development',
      nodeVersion: process.version,
      hasGeminiApiKey: hasApiKey,
      apiKeyLength: hasApiKey ? process.env.GEMINI_API_KEY.length : 0
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
}
