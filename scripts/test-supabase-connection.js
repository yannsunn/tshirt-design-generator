// Supabase接続テストスクリプト
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🔍 Supabase接続テスト開始...\n');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : '未設定'}\n`);

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ エラー: SUPABASE_URLとSUPABASE_ANON_KEYを.envに設定してください');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        // 1. テーブル存在確認
        console.log('1️⃣ design_ideasテーブルの確認...');
        const { data: tableData, error: tableError } = await supabase
            .from('design_ideas')
            .select('*')
            .limit(1);

        if (tableError) {
            console.error('❌ テーブルエラー:', tableError.message);
            return false;
        }

        console.log('✅ design_ideasテーブルが存在します\n');

        // 2. テストデータ挿入
        console.log('2️⃣ テストデータを挿入...');
        const testIdea = {
            theme: 'テスト',
            character: 'テストキャラクター：可愛い猫が日本の着物を着ている。白い毛並み、大きな黒い瞳、ピンクの鼻。',
            phrase: 'てすと',
            font_style: 'pop',
            description: 'テスト用の商品説明です。可愛い猫のデザイン。日常使いにぴったり。\n\n#テスト #猫 #日本文化',
            product_type: 'tshirt'
        };

        const { data: insertData, error: insertError } = await supabase
            .from('design_ideas')
            .insert([testIdea])
            .select();

        if (insertError) {
            console.error('❌ 挿入エラー:', insertError.message);
            return false;
        }

        console.log('✅ テストデータを挿入しました');
        console.log(`   ID: ${insertData[0].id}`);
        console.log(`   Theme: ${insertData[0].theme}`);
        console.log(`   Phrase: ${insertData[0].phrase}\n`);

        // 3. データ取得
        console.log('3️⃣ データを取得...');
        const { data: selectData, error: selectError } = await supabase
            .from('design_ideas')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3);

        if (selectError) {
            console.error('❌ 取得エラー:', selectError.message);
            return false;
        }

        console.log(`✅ ${selectData.length}件のデータを取得しました:`);
        selectData.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.phrase} (${item.theme})`);
        });

        console.log('\n✅ すべてのテストに成功しました！');
        console.log('\n📊 結果サマリー:');
        console.log(`   ✓ データベース接続: OK`);
        console.log(`   ✓ テーブル存在: OK`);
        console.log(`   ✓ データ挿入: OK`);
        console.log(`   ✓ データ取得: OK`);
        console.log(`   ✓ description カラム: ${insertData[0].description ? 'OK' : 'なし'}`);

        return true;

    } catch (error) {
        console.error('❌ 予期しないエラー:', error.message);
        return false;
    }
}

testConnection().then(success => {
    process.exit(success ? 0 : 1);
});
