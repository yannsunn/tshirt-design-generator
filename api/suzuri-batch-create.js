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
        // 衣類（16種類）
        createTshirt = true,
        createHoodie = true,
        createSweatshirt = true,
        createLongSleeveTshirt = true,
        createBigSilhouetteTshirt = true,
        createFullGraphicTshirt = true,
        createOversizeTshirt = true,
        createHeavyweightTshirt = true,
        createTankTop = true,
        createDryTshirt = true,
        createPoloShirt = true,
        createCoach = true,
        createAnorak = true,
        createZipHoodie = true,
        createCardigan = true,
        createWideSweat = true,
        // バッグ・小物（11種類）
        createToteBag = true,
        createSacoche = true,
        createPouch = true,
        createBackpack = true,
        createBodyBag = true,
        createKnapSack = true,
        createFlatPouch = true,
        createPenCase = true,
        createTravelPouch = true,
        createPassCase = true,
        createWallet = true,
        // 雑貨（20種類）
        createMug = true,
        createSticker = true,
        createAcrylicKeychain = true,
        createAcrylicBlock = true,
        createCushion = true,
        createBlanket = true,
        createCanBadge = true,
        createBigCanBadge = true,
        createCompactMirror = true,
        createPhoneRing = true,
        createTowel = true,
        createHandkerchief = true,
        createBandana = true,
        createWashTowel = true,
        createMaskingTape = true,
        createCanCase = true,
        createAcrylicStand = true,
        createJigsawPuzzle = true,
        createWallClock = true,
        createNeckPillow = true,
        // デジタル・ケース（7種類）
        createPhoneCase = true,
        createNotebook = true,
        createClearFile = true,
        createBookCover = true,
        createGlassCase = true,
        createAirPodsCase = true,
        createPCCase = true,
        // ファッション小物（8種類）
        createCap = true,
        createBucketHat = true,
        createKnitCap = true,
        createSocks = true,
        createCrewSocks = true,
        createEcoFurBag = true,
        createBigScarf = true,
        createBandanaScarf = true,
        published = false
    } = req.body;

    if (!imageUrl || !title) {
        return res.status(400).json({ error: 'imageUrl and title are required' });
    }

    const accessToken = process.env.SUZURI_ACCESS_TOKEN;

    try {
        console.log(`🚀 SUZURI一括商品作成: ${title}`);

        // 作成する商品の配列を準備（62種類）
        const productsArray = [];

        // 衣類（16種類）
        if (createTshirt) productsArray.push({ itemId: 1, published: published });
        if (createHoodie) productsArray.push({ itemId: 2, published: published });
        if (createSweatshirt) productsArray.push({ itemId: 3, published: published });
        if (createLongSleeveTshirt) productsArray.push({ itemId: 4, published: published });
        if (createBigSilhouetteTshirt) productsArray.push({ itemId: 189, published: published });
        if (createFullGraphicTshirt) productsArray.push({ itemId: 6, published: published });
        if (createOversizeTshirt) productsArray.push({ itemId: 251, published: published });
        if (createHeavyweightTshirt) productsArray.push({ itemId: 252, published: published });
        if (createTankTop) productsArray.push({ itemId: 17, published: published });
        if (createDryTshirt) productsArray.push({ itemId: 253, published: published });
        if (createPoloShirt) productsArray.push({ itemId: 254, published: published });
        if (createCoach) productsArray.push({ itemId: 255, published: published });
        if (createAnorak) productsArray.push({ itemId: 256, published: published });
        if (createZipHoodie) productsArray.push({ itemId: 257, published: published });
        if (createCardigan) productsArray.push({ itemId: 258, published: published });
        if (createWideSweat) productsArray.push({ itemId: 259, published: published });

        // バッグ・小物（11種類）
        if (createToteBag) productsArray.push({ itemId: 5, published: published });
        if (createSacoche) productsArray.push({ itemId: 228, published: published });
        if (createPouch) productsArray.push({ itemId: 73, published: published });
        if (createBackpack) productsArray.push({ itemId: 260, published: published });
        if (createBodyBag) productsArray.push({ itemId: 261, published: published });
        if (createKnapSack) productsArray.push({ itemId: 262, published: published });
        if (createFlatPouch) productsArray.push({ itemId: 263, published: published });
        if (createPenCase) productsArray.push({ itemId: 264, published: published });
        if (createTravelPouch) productsArray.push({ itemId: 265, published: published });
        if (createPassCase) productsArray.push({ itemId: 266, published: published });
        if (createWallet) productsArray.push({ itemId: 267, published: published });

        // 雑貨（20種類）
        if (createMug) productsArray.push({ itemId: 7, published: published });
        if (createSticker) productsArray.push({ itemId: 9, published: published });
        if (createAcrylicKeychain) productsArray.push({ itemId: 83, published: published });
        if (createAcrylicBlock) productsArray.push({ itemId: 128, published: published });
        if (createCushion) productsArray.push({ itemId: 49, published: published });
        if (createBlanket) productsArray.push({ itemId: 407, published: published });
        if (createCanBadge) productsArray.push({ itemId: 268, published: published });
        if (createBigCanBadge) productsArray.push({ itemId: 269, published: published });
        if (createCompactMirror) productsArray.push({ itemId: 270, published: published });
        if (createPhoneRing) productsArray.push({ itemId: 271, published: published });
        if (createTowel) productsArray.push({ itemId: 272, published: published });
        if (createHandkerchief) productsArray.push({ itemId: 273, published: published });
        if (createBandana) productsArray.push({ itemId: 274, published: published });
        if (createWashTowel) productsArray.push({ itemId: 275, published: published });
        if (createMaskingTape) productsArray.push({ itemId: 276, published: published });
        if (createCanCase) productsArray.push({ itemId: 277, published: published });
        if (createAcrylicStand) productsArray.push({ itemId: 278, published: published });
        if (createJigsawPuzzle) productsArray.push({ itemId: 279, published: published });
        if (createWallClock) productsArray.push({ itemId: 280, published: published });
        if (createNeckPillow) productsArray.push({ itemId: 281, published: published });

        // デジタル・ケース（7種類）
        if (createPhoneCase) productsArray.push({ itemId: 8, published: published });
        if (createNotebook) productsArray.push({ itemId: 10, published: published });
        if (createClearFile) productsArray.push({ itemId: 11, published: published });
        if (createBookCover) productsArray.push({ itemId: 282, published: published });
        if (createGlassCase) productsArray.push({ itemId: 283, published: published });
        if (createAirPodsCase) productsArray.push({ itemId: 284, published: published });
        if (createPCCase) productsArray.push({ itemId: 285, published: published });

        // ファッション小物（8種類）
        if (createCap) productsArray.push({ itemId: 286, published: published });
        if (createBucketHat) productsArray.push({ itemId: 287, published: published });
        if (createKnitCap) productsArray.push({ itemId: 288, published: published });
        if (createSocks) productsArray.push({ itemId: 289, published: published });
        if (createCrewSocks) productsArray.push({ itemId: 290, published: published });
        if (createEcoFurBag) productsArray.push({ itemId: 291, published: published });
        if (createBigScarf) productsArray.push({ itemId: 292, published: published });
        if (createBandanaScarf) productsArray.push({ itemId: 293, published: published });

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
