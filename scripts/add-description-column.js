// Supabaseにdescriptionカラムを追加するマイグレーションスクリプト
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ エラー: SUPABASE_URLとSUPABASE_SERVICE_ROLE_KEYを.envに設定してください');
    console.log('\n設定方法:');
    console.log('1. Supabase Dashboard → Settings → API');
    console.log('2. .envに以下を追加:');
    console.log('   SUPABASE_URL=https://your-project.supabase.co');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addDescriptionColumn() {
    console.log('🚀 Supabaseマイグレーション開始...\n');
    console.log('📋 実行SQL:');
    console.log('   ALTER TABLE design_ideas ADD COLUMN description TEXT;\n');

    try {
        // SQLを直接実行
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: 'ALTER TABLE design_ideas ADD COLUMN IF NOT EXISTS description TEXT;'
        });

        if (error) {
            // rpc関数が存在しない場合は、RESTエンドポイント経由で実行を試みる
            console.warn('⚠️ rpc関数が使えません。代替方法を試します...\n');

            // Postgrestを使った方法
            console.log('📝 手動実行が必要です:');
            console.log('\n以下のSQLをSupabase SQL Editorで実行してください:');
            console.log('--------------------------------------------------');
            console.log('ALTER TABLE design_ideas');
            console.log('ADD COLUMN IF NOT EXISTS description TEXT;');
            console.log('--------------------------------------------------\n');
            console.log('または、Supabase CLI をインストールして実行:');
            console.log('  npm install -g supabase');
            console.log('  supabase migration new add_description_column');
            process.exit(1);
        }

        console.log('✅ マイグレーション成功！');

        // 確認
        const { data: columns, error: checkError } = await supabase
            .from('design_ideas')
            .select('*')
            .limit(1);

        if (!checkError) {
            console.log('\n📊 design_ideasテーブルのカラム:');
            if (columns && columns.length > 0) {
                console.log(Object.keys(columns[0]).join(', '));
            }
        }

        console.log('\n✅ 完了！descriptionカラムが追加されました。');

    } catch (error) {
        console.error('❌ マイグレーションエラー:', error.message);
        console.log('\n📝 手動実行してください:');
        console.log('--------------------------------------------------');
        console.log('ALTER TABLE design_ideas');
        console.log('ADD COLUMN IF NOT EXISTS description TEXT;');
        console.log('--------------------------------------------------');
        process.exit(1);
    }
}

addDescriptionColumn();
