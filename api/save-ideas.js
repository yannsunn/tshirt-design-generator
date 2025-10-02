import { getSupabaseClient } from '../lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { theme, ideas, productTypes = ['tshirt'] } = req.body;

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

        // 各商品タイプごとにアイデアを保存
        const records = [];
        for (const productType of productTypes) {
            for (const idea of ideas) {
                records.push({
                    theme,
                    character: idea.character,
                    phrase: idea.phrase,
                    font_style: idea.fontStyle,
                    product_type: productType
                });
            }
        }

        const { data, error } = await supabase
            .from('design_ideas')
            .insert(records)
            .select();

        if (error) {
            console.error('Supabase insert error:', error);
            throw new Error(`データベース保存エラー: ${error.message}`);
        }

        const typesText = productTypes.join(', ');
        console.log(`✅ ${data.length}件のアイデアを保存しました (${ideas.length}アイデア × ${productTypes.length}タイプ: ${typesText})`);
        res.status(200).json({
            saved: true,
            count: data.length,
            productTypes: productTypes,
            message: `${data.length}件のアイデアを保存しました (${productTypes.length}商品タイプ)`
        });

    } catch (error) {
        console.error('Error in /api/save-ideas:', error);
        res.status(500).json({ error: error.message });
    }
}
