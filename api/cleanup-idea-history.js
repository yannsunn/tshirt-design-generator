/**
 * Supabase デザインアイデア履歴のクリーンアップ
 * 未出品のアイデアを削除
 */

import { getSupabaseClient } from '../lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { deleteAll = false, keepDays = 30 } = req.body;

        const supabase = getSupabaseClient();

        if (!supabase) {
            return res.status(400).json({ error: 'Supabase not configured' });
        }

        let deletedCount = 0;

        if (deleteAll) {
            // 全削除
            const { data, error } = await supabase
                .from('design_ideas')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // すべて削除（IDが存在するもの）

            if (error) {
                throw new Error(`削除エラー: ${error.message}`);
            }

            // 削除件数を取得
            const { count } = await supabase
                .from('design_ideas')
                .select('*', { count: 'exact', head: true });

            deletedCount = count || 0;

            console.log(`🗑️ 全アイデア履歴を削除しました`);
        } else {
            // 指定日数より古いものを削除
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - keepDays);

            const { data, error, count } = await supabase
                .from('design_ideas')
                .delete()
                .lt('created_at', cutoffDate.toISOString())
                .select('*', { count: 'exact' });

            if (error) {
                throw new Error(`削除エラー: ${error.message}`);
            }

            deletedCount = count || 0;

            console.log(`🗑️ ${keepDays}日より古いアイデア ${deletedCount}件を削除しました`);
        }

        // 残り件数を確認
        const { count: remainingCount } = await supabase
            .from('design_ideas')
            .select('*', { count: 'exact', head: true });

        res.status(200).json({
            success: true,
            deleted: deletedCount,
            remaining: remainingCount,
            message: deleteAll
                ? `全アイデア履歴を削除しました（残り: ${remainingCount}件）`
                : `${keepDays}日より古いアイデア ${deletedCount}件を削除しました（残り: ${remainingCount}件）`
        });

    } catch (error) {
        console.error('Error in /api/cleanup-idea-history:', error);
        res.status(500).json({ error: error.message });
    }
}
