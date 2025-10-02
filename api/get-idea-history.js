import { getSupabaseClient } from '../lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { theme, limit = 50 } = req.body;

        const supabase = getSupabaseClient();

        if (!supabase) {
            console.warn('Supabase not configured, returning empty history');
            return res.status(200).json({
                history: [],
                message: 'Supabase未設定'
            });
        }

        // 過去30日間のアイデアを取得（テーマ指定がある場合はフィルタ）
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let query = supabase
            .from('design_ideas')
            .select('character, phrase, font_style, theme, created_at')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(limit);

        // テーマが指定されている場合、同じテーマのみ取得
        if (theme) {
            query = query.eq('theme', theme);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Supabase select error:', error);
            throw new Error(`データベース取得エラー: ${error.message}`);
        }

        console.log(`📖 ${data.length}件の履歴を取得しました (テーマ: ${theme || 'すべて'})`);
        res.status(200).json({
            history: data,
            count: data.length
        });

    } catch (error) {
        console.error('Error in /api/get-idea-history:', error);
        res.status(500).json({ error: error.message });
    }
}
