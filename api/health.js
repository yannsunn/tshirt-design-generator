export default function handler(req, res) {
    res.status(200).json({
        status: 'ok',
        geminiConfigured: !!process.env.GEMINI_API_KEY,
        falConfigured: !!process.env.FAL_API_KEY,
        printifyConfigured: !!process.env.PRINTIFY_API_KEY
    });
}