import { getSupabaseClient } from '../lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const supabase = getSupabaseClient();

        if (!supabase) {
            return res.status(200).json({
                configured: false,
                message: '❌ Supabase環境変数が設定されていません',
                required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY']
            });
        }

        // 接続テスト: テーブルからデータを取得（件数のみ）
        const { data, error, count } = await supabase
            .from('design_ideas')
            .select('*', { count: 'exact', head: true });

        if (error) {
            return res.status(500).json({
                configured: true,
                connected: false,
                error: error.message,
                message: `❌ Supabase接続エラー: ${error.message}`,
                hint: 'テーブル "design_ideas" が作成されているか確認してください'
            });
        }

        // 最新のレコードを5件取得
        const { data: recentIdeas, error: fetchError } = await supabase
            .from('design_ideas')
            .select('theme, phrase, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        if (fetchError) {
            return res.status(500).json({
                configured: true,
                connected: false,
                error: fetchError.message
            });
        }

        return res.status(200).json({
            configured: true,
            connected: true,
            message: '✅ Supabase接続成功！',
            stats: {
                totalIdeas: count || 0,
                recentIdeas: recentIdeas || []
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in /api/test-supabase:', error);
        return res.status(500).json({
            configured: false,
            connected: false,
            error: error.message,
            message: `❌ エラー: ${error.message}`
        });
    }
}
