import { getSupabaseClient } from '../lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { theme, ideas } = req.body;

        if (!theme || !ideas || !Array.isArray(ideas)) {
            return res.status(400).json({ error: 'テーマとアイデアが必要です' });
        }

        const supabase = getSupabaseClient();

        if (!supabase) {
            console.warn('Supabase not configured, skipping save');
            return res.status(200).json({
                saved: false,
                message: 'Supabase未設定のため保存をスキップしました'
            });
        }

        // 各アイデアを保存
        const records = ideas.map(idea => ({
            theme,
            character: idea.character,
            phrase: idea.phrase,
            font_style: idea.fontStyle
        }));

        const { data, error } = await supabase
            .from('design_ideas')
            .insert(records)
            .select();

        if (error) {
            console.error('Supabase insert error:', error);
            throw new Error(`データベース保存エラー: ${error.message}`);
        }

        console.log(`✅ ${data.length}件のアイデアを保存しました`);
        res.status(200).json({
            saved: true,
            count: data.length,
            message: `${data.length}件のアイデアを保存しました`
        });

    } catch (error) {
        console.error('Error in /api/save-ideas:', error);
        res.status(500).json({ error: error.message });
    }
}
