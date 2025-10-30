// アイデア履歴保存API（画像生成成功後に呼ばれる）
import { getSupabaseClient } from '../lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { theme, ideas, productTypes = ['tshirt'] } = req.body;

        // 入力バリデーション
        if (!theme || !ideas || !Array.isArray(ideas) || ideas.length === 0) {
            return res.status(400).json({ error: 'テーマとアイデアが必要です' });
        }

        const supabase = getSupabaseClient();

        // Supabaseが設定されていない場合はスキップ
        if (!supabase) {
            console.log('ℹ️ Supabase未設定のため履歴保存をスキップ');
            return res.status(200).json({
                saved: false,
                message: 'Supabase未設定のため履歴保存をスキップしました'
            });
        }

        // 各アイデアを保存
        const records = [];
        for (const idea of ideas) {
            // 各商品タイプについて保存（重複チェック用）
            for (const productType of productTypes) {
                records.push({
                    theme: theme,
                    character: idea.character || '',
                    phrase: idea.phrase || idea.title || '',
                    font_style: idea.fontStyle || 'modern',
                    product_type: productType,
                    created_at: new Date().toISOString()
                });
            }
        }

        // 一括保存
        const { data, error } = await supabase
            .from('design_ideas')
            .insert(records);

        if (error) {
            console.error('❌ Supabase保存エラー:', error);
            throw new Error(`履歴保存に失敗しました: ${error.message}`);
        }

        console.log(`✅ ${records.length}件のアイデアを履歴に保存しました`);
        res.status(200).json({
            saved: true,
            count: records.length,
            message: `${records.length}件のアイデアを履歴に保存しました`
        });

    } catch (error) {
        console.error('❌ /api/save-ideas エラー:', error);
        res.status(500).json({
            error: error.message || 'Internal server error',
            details: error.stack
        });
    }
}
