/**
 * Supabase デザインアイデア履歴のスマートクリーンアップ
 *
 * 出品できない商品に対応するアイデアのみ削除
 * 出品可能な商品に対応するアイデアは保持
 */

import { getSupabaseClient } from '../lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.PRINTIFY_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'PRINTIFY_API_KEY not configured' });
    }

    try {
        const { shopId, dryRun = true } = req.body;

        if (!shopId) {
            return res.status(400).json({ error: 'shopId is required' });
        }

        const supabase = getSupabaseClient();
        if (!supabase) {
            return res.status(400).json({ error: 'Supabase not configured' });
        }

        // Step 1: Printifyから未出品商品を取得
        const printifyResponse = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!printifyResponse.ok) {
            throw new Error(`Printify API error: ${printifyResponse.status}`);
        }

        const printifyResult = await printifyResponse.json();
        const products = printifyResult.data || [];

        // Blueprint原価データ
        const blueprintCosts = {
            706: { base: 1241, sizes: { '2XL': 1367, '3XL': 1571, '4XL': 1766 } },
            1296: { base: 3064, sizes: { '2XL': 3548, '3XL': 4181 } },
            6: { base: 1167, sizes: { '2XL': 1544, '3XL': 1636, '4XL': 1636, '5XL': 1636 } },
            49: { base: 2230, sizes: {} },
            12: { base: 1636, sizes: { '2XL': 2039 } }
        };

        // Step 2: 価格が不正な未出品商品を特定
        const unpublishableProducts = [];

        for (const product of products) {
            const blueprintId = product.blueprint_id;
            const isPublished = product.is_locked;

            if (isPublished) continue; // 出品済みはスキップ

            const variants = product.variants || [];
            let allPricesValid = true;

            for (const variant of variants) {
                const price = variant.price;
                const cost = variant.cost || blueprintCosts[blueprintId]?.base || 0;

                const margin = cost > 0 ? ((price - cost) / price * 100) : 0;
                const isMarginOk = margin >= 37.5 && margin <= 38.5;
                const isPriceOk = (price % 100) === 99;

                if (!isMarginOk || !isPriceOk) {
                    allPricesValid = false;
                    break;
                }
            }

            if (!allPricesValid) {
                unpublishableProducts.push({
                    id: product.id,
                    title: product.title,
                    blueprintId: blueprintId
                });
            }
        }

        console.log(`❌ 出品不可商品: ${unpublishableProducts.length}件`);

        // Step 3: Supabaseから対応するアイデアを特定
        // タイトルからキャラクター・フレーズを抽出してマッチング
        const ideasToDelete = [];

        for (const product of unpublishableProducts) {
            const title = product.title;

            // タイトルからキャラクター・フレーズを推定
            // 例: "日本の侍 - 武士道の精神 (Bushido Spirit)" → character or phrase に含まれる可能性
            const { data: matchingIdeas, error } = await supabase
                .from('design_ideas')
                .select('*')
                .or(`character.ilike.%${title}%,phrase.ilike.%${title}%`);

            if (!error && matchingIdeas && matchingIdeas.length > 0) {
                ideasToDelete.push(...matchingIdeas);
            }
        }

        console.log(`🗑️ 削除対象アイデア: ${ideasToDelete.length}件`);

        if (dryRun) {
            return res.status(200).json({
                dryRun: true,
                message: `${ideasToDelete.length}件のアイデアが削除対象です（ドライラン）`,
                note: 'dryRun=false で実際に削除します',
                unpublishableProducts: unpublishableProducts.length,
                ideasToDelete: ideasToDelete.map(idea => ({
                    id: idea.id,
                    character: idea.character,
                    phrase: idea.phrase,
                    created_at: idea.created_at
                }))
            });
        }

        // Step 4: 実際に削除
        let deletedCount = 0;

        for (const idea of ideasToDelete) {
            const { error } = await supabase
                .from('design_ideas')
                .delete()
                .eq('id', idea.id);

            if (!error) {
                deletedCount++;
            }
        }

        // 残り件数を確認
        const { count: remainingCount } = await supabase
            .from('design_ideas')
            .select('*', { count: 'exact', head: true });

        res.status(200).json({
            success: true,
            deleted: deletedCount,
            remaining: remainingCount,
            unpublishableProducts: unpublishableProducts.length,
            message: `出品不可商品に対応する ${deletedCount}件のアイデアを削除しました（残り: ${remainingCount}件）`
        });

    } catch (error) {
        console.error('Error in /api/cleanup-unpublishable-ideas:', error);
        res.status(500).json({ error: error.message });
    }
}
