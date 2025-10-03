// 処理済み商品トラッカー
// Supabaseで処理済み商品を記録・チェックする

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

// Supabaseクライアントを初期化（遅延初期化）
function getSupabaseClient() {
    if (!supabase && supabaseUrl && supabaseKey) {
        supabase = createClient(supabaseUrl, supabaseKey);
    }
    return supabase;
}

/**
 * 商品が既に処理済みかチェック
 * @param {string} productId - Printify商品ID
 * @param {string} shopId - PrintifyショップID
 * @param {string} processType - 処理タイプ (price_update, express_shipping など)
 * @returns {Promise<boolean>} - 処理済みならtrue
 */
export async function isProductProcessed(productId, shopId, processType) {
    const client = getSupabaseClient();
    if (!client) {
        console.warn('⚠️ Supabase未設定: 処理済みチェックをスキップ');
        return false; // Supabase未設定なら重複チェックなし
    }

    try {
        const { data, error } = await client
            .from('processed_products')
            .select('id, created_at')
            .eq('product_id', productId)
            .eq('shop_id', shopId)
            .eq('process_type', processType)
            .single();

        if (error) {
            // レコードが見つからない場合（未処理）
            if (error.code === 'PGRST116') {
                return false;
            }
            console.error('処理済みチェックエラー:', error.message);
            return false; // エラー時は処理を許可
        }

        // レコードが存在する = 処理済み
        return !!data;

    } catch (error) {
        console.error('isProductProcessed エラー:', error);
        return false; // エラー時は処理を許可
    }
}

/**
 * 商品を処理済みとして記録
 * @param {string} productId - Printify商品ID
 * @param {string} shopId - PrintifyショップID
 * @param {string} processType - 処理タイプ (price_update, express_shipping など)
 * @param {string} productTitle - 商品タイトル
 * @param {object} metadata - 処理詳細（JSON形式）
 * @returns {Promise<boolean>} - 成功ならtrue
 */
export async function markProductAsProcessed(productId, shopId, processType, productTitle = null, metadata = null) {
    const client = getSupabaseClient();
    if (!client) {
        console.warn('⚠️ Supabase未設定: 処理済み記録をスキップ');
        return false;
    }

    try {
        const { data, error } = await client
            .from('processed_products')
            .upsert({
                product_id: productId,
                shop_id: shopId,
                process_type: processType,
                product_title: productTitle,
                metadata: metadata
            }, {
                onConflict: 'product_id,shop_id,process_type' // UNIQUE制約に基づくUPSERT
            })
            .select();

        if (error) {
            console.error('処理済み記録エラー:', error.message);
            return false;
        }

        console.log(`✅ 処理済みとして記録: ${productId} (${processType})`);
        return true;

    } catch (error) {
        console.error('markProductAsProcessed エラー:', error);
        return false;
    }
}

/**
 * 処理済み商品の統計を取得
 * @param {string} shopId - PrintifyショップID
 * @param {string} processType - 処理タイプ (省略可能)
 * @returns {Promise<object>} - { total, byType: {...} }
 */
export async function getProcessedStats(shopId, processType = null) {
    const client = getSupabaseClient();
    if (!client) {
        return { total: 0, byType: {} };
    }

    try {
        let query = client
            .from('processed_products')
            .select('process_type')
            .eq('shop_id', shopId);

        if (processType) {
            query = query.eq('process_type', processType);
        }

        const { data, error } = await query;

        if (error) {
            console.error('統計取得エラー:', error.message);
            return { total: 0, byType: {} };
        }

        // process_typeごとに集計
        const byType = {};
        data.forEach(item => {
            byType[item.process_type] = (byType[item.process_type] || 0) + 1;
        });

        return {
            total: data.length,
            byType
        };

    } catch (error) {
        console.error('getProcessedStats エラー:', error);
        return { total: 0, byType: {} };
    }
}

/**
 * 処理済み記録をリセット（全削除または特定タイプのみ）
 * @param {string} shopId - PrintifyショップID
 * @param {string} processType - 処理タイプ (省略時は全削除)
 * @returns {Promise<number>} - 削除件数
 */
export async function resetProcessedProducts(shopId, processType = null) {
    const client = getSupabaseClient();
    if (!client) {
        console.warn('⚠️ Supabase未設定: リセット不可');
        return 0;
    }

    try {
        let query = client
            .from('processed_products')
            .delete()
            .eq('shop_id', shopId);

        if (processType) {
            query = query.eq('process_type', processType);
        }

        const { data, error } = await query.select();

        if (error) {
            console.error('リセットエラー:', error.message);
            return 0;
        }

        const count = data ? data.length : 0;
        console.log(`🔄 処理済み記録をリセット: ${count}件削除`);
        return count;

    } catch (error) {
        console.error('resetProcessedProducts エラー:', error);
        return 0;
    }
}
