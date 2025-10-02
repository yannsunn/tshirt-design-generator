import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

export const getSupabaseClient = () => {
    if (supabaseClient) {
        return supabaseClient;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.warn('⚠️ Supabase credentials not configured. Duplicate check will be skipped.');
        return null;
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
    return supabaseClient;
};
