// Supabaseクライアント初期化（重複防止用）
import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

/**
 * Supabaseクライアントを取得（シングルトンパターン）
 * 環境変数が設定されていない場合はnullを返す
 */
export function getSupabaseClient() {
    // 既に初期化済みの場合はそれを返す
    if (supabaseClient) {
        return supabaseClient;
    }

    // 環境変数チェック
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.log('ℹ️ Supabase未設定（SUPABASE_URLまたはSUPABASE_ANON_KEYが設定されていません）');
        return null;
    }

    try {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        console.log('✅ Supabaseクライアント初期化完了');
        return supabaseClient;
    } catch (error) {
        console.error('❌ Supabase初期化エラー:', error);
        return null;
    }
}
