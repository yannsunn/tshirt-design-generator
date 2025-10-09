// SUZURI API - 一括商品作成（既存デザインからSUZURI商品を作成）
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv, ExternalAPIError } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    validateEnv(['SUZURI_ACCESS_TOKEN']);

    const {
        imageUrl,
        title,
        description = null,
        // SUZURI 全商品タイプ（61種類）
        createStandardTshirt = true,            // 1: スタンダードTシャツ
        createToteBag = true,                   // 2: トートバッグ
        createMug = true,                       // 3: マグカップ
        createPhoneCase = true,                 // 4: スマホケース（iPhone）
        createSweatshirt = true,                // 5: スウェット
        createFullGraphicTshirt = true,         // 8: フルグラフィックTシャツ
        createHoodie = true,                    // 9: パーカー
        createNotebook = true,                  // 10: ノート
        createSticker = true,                   // 11: ステッカー
        createTowelHandkerchief = true,         // 14: タオルハンカチ
        createLongSleeveTshirt = true,          // 15: ロングスリーブTシャツ
        createSacoche = true,                   // 16: サコッシュ
        createCanBadge = true,                  // 17: 缶バッジ
        createClearSmartphoneCase = true,       // 18: クリアスマホケース
        createTarpaulin = true,                 // 20: 吸着ポスター
        createAcrylicBlock = true,              // 21: アクリルブロック
        createBookStyleSmartphoneCase = true,   // 23: 手帳型スマホケース
        createZipHoodie = true,                 // 28: ジップパーカー
        createKinchaku = true,                  // 61: きんちゃく
        createBigShoulderBag = true,            // 62: ビッグショルダーバッグ
        createBigSweat = true,                  // 95: ビッグシルエットスウェット
        createWaterGlass = true,                // 97: グラス
        createSoftClearSmartphoneCase = true,   // 98: ソフトクリアスマホケース
        createFivePanelCap = true,              // 99: ジェットキャップ
        createBigTshirt = true,                 // 100: ビッグシルエットTシャツ
        createClearFileFolder = true,           // 101: クリアファイル
        createBucketHat = true,                 // 102: バケットハット
        createClearMultiCase = true,            // 103: クリアマルチケース
        createMiniClearMultiCase = true,        // 104: ミニクリアマルチケース
        createSandal = true,                    // 105: サンダル
        createBigLongSleeveTshirt = true,       // 106: ビッグシルエットロングスリーブTシャツ
        createBandana = true,                   // 107: バンダナ
        createReusablBag = true,                // 108: エコバッグ
        createThermoTumbler = true,             // 109: サーモタンブラー
        createFullGraphicMask = true,           // 110: フルグラフィックマスク
        createOrganicCottonTshirt = true,       // 111: オーガニックコットンTシャツ
        createDryTshirt = true,                 // 112: ドライTシャツ
        createAcrylicKeychain = true,           // 147: アクリルキーホルダー
        createHeavyweightTshirt = true,         // 148: ヘビーウェイトTシャツ
        createOversizedTshirt = true,           // 149: オーバーサイズTシャツ
        createLongSizedWaterGlass = true,       // 150: ロンググラス
        createCushion = true,                   // 151: クッション
        createHeavyweightHoodie = true,         // 152: ヘビーウェイトパーカー
        createHeavyweightZipHoodie = true,      // 153: ヘビーウェイトジップパーカー
        createHeavyweightSweat = true,          // 154: ヘビーウェイトスウェット
        createEmbroideredTshirt = true,         // 155: 刺しゅうTシャツ
        createLunchToteBag = true,              // 158: ランチトートバッグ
        createAcrylicStand = true,              // 159: アクリルスタンド
        createAnkleSocks = true,                // 160: くるぶしソックス
        createSocks = true,                     // 161: ソックス
        createOnePointTshirt = true,            // 162: ワンポイントTシャツ
        createSmartphoneStrap = true,           // 195: スマホストラップ
        createFlatCanCase = true,               // 228: フラット缶ケース
        createMaskingTape = true,               // 261: マスキングテープ
        createAndroidSmartphoneCase = true,     // 294: スマホケース（Android）
        createEmbroideredFleeceJacket = true,   // 327: 刺しゅうフリースジャケット
        createLightweightTshirt = true,         // 360: ライトウェイトTシャツ
        createFaceTowel = true,                 // 393: フェイスタオル
        createFlatPouch = true,                 // 426: フラットポーチ
        createBlanket = true,                   // 13: ブランケット
        createBigHoodie = true,                 // 96: ビッグシルエットパーカー
        published = false
    } = req.body;

    if (!imageUrl || !title) {
        return res.status(400).json({ error: 'imageUrl and title are required' });
    }

    const accessToken = process.env.SUZURI_ACCESS_TOKEN;

    try {
        console.log(`🚀 SUZURI一括商品作成: ${title}`);

        // 作成する商品の配列を準備（61種類）
        const productsArray = [];

        // SUZURI 全商品タイプ（実際のAPI IDに基づく）
        if (createStandardTshirt) productsArray.push({ itemId: 1, published: published });
        if (createToteBag) productsArray.push({ itemId: 2, published: published });
        if (createMug) productsArray.push({ itemId: 3, published: published });
        if (createPhoneCase) productsArray.push({ itemId: 4, published: published });
        if (createSweatshirt) productsArray.push({ itemId: 5, published: published });
        if (createFullGraphicTshirt) productsArray.push({ itemId: 8, published: published });
        if (createHoodie) productsArray.push({ itemId: 9, published: published });
        if (createNotebook) productsArray.push({ itemId: 10, published: published });
        if (createSticker) productsArray.push({ itemId: 11, published: published });
        if (createBlanket) productsArray.push({ itemId: 13, published: published });
        if (createTowelHandkerchief) productsArray.push({ itemId: 14, published: published });
        if (createLongSleeveTshirt) productsArray.push({ itemId: 15, published: published });
        if (createSacoche) productsArray.push({ itemId: 16, published: published });
        if (createCanBadge) productsArray.push({ itemId: 17, published: published });
        if (createClearSmartphoneCase) productsArray.push({ itemId: 18, published: published });
        if (createTarpaulin) productsArray.push({ itemId: 20, published: published });
        if (createAcrylicBlock) productsArray.push({ itemId: 21, published: published });
        if (createBookStyleSmartphoneCase) productsArray.push({ itemId: 23, published: published });
        if (createZipHoodie) productsArray.push({ itemId: 28, published: published });
        if (createKinchaku) productsArray.push({ itemId: 61, published: published });
        if (createBigShoulderBag) productsArray.push({ itemId: 62, published: published });
        if (createBigSweat) productsArray.push({ itemId: 95, published: published });
        if (createBigHoodie) productsArray.push({ itemId: 96, published: published });
        if (createWaterGlass) productsArray.push({ itemId: 97, published: published });
        if (createSoftClearSmartphoneCase) productsArray.push({ itemId: 98, published: published });
        if (createFivePanelCap) productsArray.push({ itemId: 99, published: published });
        if (createBigTshirt) productsArray.push({ itemId: 100, published: published });
        if (createClearFileFolder) productsArray.push({ itemId: 101, published: published });
        if (createBucketHat) productsArray.push({ itemId: 102, published: published });
        if (createClearMultiCase) productsArray.push({ itemId: 103, published: published });
        if (createMiniClearMultiCase) productsArray.push({ itemId: 104, published: published });
        if (createSandal) productsArray.push({ itemId: 105, published: published });
        if (createBigLongSleeveTshirt) productsArray.push({ itemId: 106, published: published });
        if (createBandana) productsArray.push({ itemId: 107, published: published });
        if (createReusablBag) productsArray.push({ itemId: 108, published: published });
        if (createThermoTumbler) productsArray.push({ itemId: 109, published: published });
        if (createFullGraphicMask) productsArray.push({ itemId: 110, published: published });
        if (createOrganicCottonTshirt) productsArray.push({ itemId: 111, published: published });
        if (createDryTshirt) productsArray.push({ itemId: 112, published: published });
        if (createAcrylicKeychain) productsArray.push({ itemId: 147, published: published });
        if (createHeavyweightTshirt) productsArray.push({ itemId: 148, published: published });
        if (createOversizedTshirt) productsArray.push({ itemId: 149, published: published });
        if (createLongSizedWaterGlass) productsArray.push({ itemId: 150, published: published });
        if (createCushion) productsArray.push({ itemId: 151, published: published });
        if (createHeavyweightHoodie) productsArray.push({ itemId: 152, published: published });
        if (createHeavyweightZipHoodie) productsArray.push({ itemId: 153, published: published });
        if (createHeavyweightSweat) productsArray.push({ itemId: 154, published: published });
        if (createEmbroideredTshirt) productsArray.push({ itemId: 155, published: published });
        if (createLunchToteBag) productsArray.push({ itemId: 158, published: published });
        if (createAcrylicStand) productsArray.push({ itemId: 159, published: published });
        if (createAnkleSocks) productsArray.push({ itemId: 160, published: published });
        if (createSocks) productsArray.push({ itemId: 161, published: published });
        if (createOnePointTshirt) productsArray.push({ itemId: 162, published: published });
        if (createSmartphoneStrap) productsArray.push({ itemId: 195, published: published });
        if (createFlatCanCase) productsArray.push({ itemId: 228, published: published });
        if (createMaskingTape) productsArray.push({ itemId: 261, published: published });
        if (createAndroidSmartphoneCase) productsArray.push({ itemId: 294, published: published });
        if (createEmbroideredFleeceJacket) productsArray.push({ itemId: 327, published: published });
        if (createLightweightTshirt) productsArray.push({ itemId: 360, published: published });
        if (createFaceTowel) productsArray.push({ itemId: 393, published: published });
        if (createFlatPouch) productsArray.push({ itemId: 426, published: published });

        // Material + Products を1リクエストで作成
        console.log(`📤 Material + ${productsArray.length}種類の商品を作成中...`);
        const materialBody = {
            texture: imageUrl,
            title: title,
            products: productsArray
        };

        // 商品説明が提供されている場合は追加
        if (description) {
            materialBody.description = description;
        }

        const materialResponse = await fetch('https://suzuri.jp/api/v1/materials', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(materialBody)
        });

        if (!materialResponse.ok) {
            const errorText = await materialResponse.text();
            throw new ExternalAPIError('SUZURI', `Material + Products作成失敗 (${materialResponse.status})`, errorText);
        }

        const result = await materialResponse.json();
        const materialId = result.id;
        const products = result.products || [];

        console.log(`✅ Material作成成功: ID ${materialId}`);
        console.log(`✅ Products作成成功: ${products.length}件`);

        const successCount = products.length;
        console.log(`\n✅ SUZURI一括作成完了: ${successCount}/${productsArray.length}件成功`);

        res.status(200).json({
            success: true,
            materialId: materialId,
            productsCreated: successCount,
            productsTotal: productsArray.length,
            products: products,
            message: published
                ? `SUZURI商品を${successCount}件作成・公開しました`
                : `SUZURI商品を${successCount}件作成しました（下書き状態）`,
            note: 'トリブン（利益）を設定する場合は、SUZURI管理画面から設定してください',
            suzuriUrl: `https://suzuri.jp/`
        });

    } catch (error) {
        console.error('❌ SUZURI一括作成エラー:', error);
        throw error;
    }
}

// レート制限: 5リクエスト/分（重い処理）
export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 5, windowMs: 60000 }
);
