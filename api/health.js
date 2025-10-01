export default function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    res.status(200).json({
        status: 'ok',
        geminiConfigured: !!process.env.GEMINI_API_KEY,
        seedreamConfigured: !!process.env.FAL_API_KEY,  // Seedream 4.0 uses FAL_API_KEY
        printifyConfigured: !!process.env.PRINTIFY_API_KEY,
        removebgConfigured: !!process.env.REMOVEBG_API_KEY
    });
}