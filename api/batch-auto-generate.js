// バッチ処理自動出品API - 全自動でデザイン生成 → 商品作成
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { asyncHandler, validateEnv, ExternalAPIError } from '../lib/errorHandler.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 環境変数検証
    validateEnv(['GEMINI_API_KEY', 'PRINTIFY_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY']);

    const {
        theme = null,  // null = ランダム選択
        productTypes = ['tshirt', 'sweatshirt', 'hoodie'],  // デフォルト3種
        ideaCount = 3,  // デザイン数（デフォルト3: 3タイプ×3デザイン=9商品）
        shopId,
        autoPublish = false  // 自動公開オプション
    } = req.body;

    if (!shopId) {
        return res.status(400).json({ error: 'shopId is required' });
    }

    console.log('🤖 バッチ処理開始:', { theme, productTypes, ideaCount, shopId });

    const results = {
        theme: '',
        ideas: [],
        images: [],
        products: [],
        errors: [],
        summary: {}
    };

    try {
        // 1. テーマ選択（ランダムまたは指定）
        const themes = [
            // 伝統文化
            { value: 'samurai', label: '侍 (Samurai)' },
            { value: 'sumo', label: '相撲 (Sumo)' },
            { value: 'ninja', label: '忍者 (Ninja)' },
            { value: 'geisha', label: '芸者 (Geisha)' },
            { value: 'sakura', label: '桜 (Cherry Blossom)' },
            { value: 'fuji', label: '富士山 (Mt. Fuji)' },
            // 食文化
            { value: 'ramen', label: 'ラーメン (Ramen)' },
            { value: 'sushi', label: '寿司 (Sushi)' },
            // 動物
            { value: 'cat', label: '猫 (Maneki-neko)' },
            { value: 'deer', label: '鹿 (Deer in Nara)' },
            // 日本民話・伝説（パブリックドメイン）
            { value: 'momotaro', label: '桃太郎 (Momotaro - Public Domain)' },
            { value: 'kintaro', label: '金太郎 (Kintaro - Public Domain)' },
            { value: 'urashima-taro', label: '浦島太郎 (Urashima Taro - Public Domain)' },
            // 妖怪（パブリックドメイン伝統妖怪）
            { value: 'kitsune', label: '狐 (Kitsune Fox Spirit - Public Domain)' },
            { value: 'tanuki', label: '狸 (Tanuki Raccoon Dog - Public Domain)' },
            { value: 'kappa', label: '河童 (Kappa Water Imp - Public Domain)' },
            { value: 'tengu', label: '天狗 (Tengu Mountain Goblin - Public Domain)' },
            // アニメ風（著作権フリー）
            { value: 'kawaii-animal', label: 'かわいい動物アニメ (Kawaii Animal Anime)' },
            { value: 'chibi-warrior', label: 'ちび戦士 (Chibi Warrior)' },
            { value: 'yokai-anime', label: '妖怪アニメ (Yokai Anime Style)' },
            { value: 'shrine-maiden', label: '巫女さん (Shrine Maiden Anime)' },
            { value: 'samurai-anime', label: '侍アニメ (Samurai Anime Style)' },
            { value: 'magical-pet', label: '魔法のペット (Magical Pet)' },
            { value: 'school-anime', label: '学園もの (School Life Anime)' },
            { value: 'robot-anime', label: 'ロボットアニメ (Robot Anime Generic)' }
        ];

        const selectedTheme = theme || themes[Math.floor(Math.random() * themes.length)].value;
        results.theme = selectedTheme;
        console.log('📌 選択されたテーマ:', selectedTheme);

        // 2. アイデア生成
        console.log('💡 アイデア生成中...');
        const ideasResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/generate-ideas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                theme: selectedTheme,
                productTypes: productTypes
            })
        });

        if (!ideasResponse.ok) {
            throw new ExternalAPIError('Generate Ideas', `Failed: ${ideasResponse.status}`);
        }

        const ideasData = await ideasResponse.json();
        const ideas = ideasData.ideas.slice(0, ideaCount);  // 指定数に制限
        results.ideas = ideas;
        console.log(`✅ ${ideas.length}個のアイデア生成完了`);

        // 3. 画像生成
        console.log('🎨 画像生成中...');
        for (let i = 0; i < ideas.length; i++) {
            const idea = ideas[i];
            console.log(`  [${i + 1}/${ideas.length}] 生成中: ${idea.phrase}`);

            try {
                const imageResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/generate-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: `Japanese culture design for T-shirt: ${idea.character} with text "${idea.phrase}" in ${idea.fontStyle} style. White background for easy removal. Black text and design elements.`,
                        api: 'gemini'
                    })
                });

                if (!imageResponse.ok) {
                    results.errors.push({
                        step: 'image_generation',
                        idea: idea.phrase,
                        error: `Failed: ${imageResponse.status}`
                    });
                    continue;
                }

                const imageData = await imageResponse.json();
                results.images.push({
                    idea,
                    imageData: imageData.imageData
                });
                console.log(`  ✅ 画像生成成功: ${idea.phrase}`);
            } catch (error) {
                results.errors.push({
                    step: 'image_generation',
                    idea: idea.phrase,
                    error: error.message
                });
            }

            // レート制限対策: 1秒待機
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`✅ ${results.images.length}/${ideas.length}個の画像生成完了`);

        // 4. 商品作成
        console.log('🛒 商品作成中...');
        for (let i = 0; i < results.images.length; i++) {
            const imgData = results.images[i];
            console.log(`  [${i + 1}/${results.images.length}] 商品作成: ${imgData.idea.phrase}`);

            try {
                // 画像圧縮 (簡易版 - フロントエンドと同じロジックが必要)
                const compressedImage = imgData.imageData;  // TODO: 圧縮実装

                // 画像アップロード
                const uploadResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/printify-upload-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageData: compressedImage,
                        fileName: `batch-${Date.now()}-${i}.png`
                    })
                });

                if (!uploadResponse.ok) {
                    results.errors.push({
                        step: 'image_upload',
                        idea: imgData.idea.phrase,
                        error: `Upload failed: ${uploadResponse.status}`
                    });
                    continue;
                }

                const { imageId } = await uploadResponse.json();

                // 各商品タイプで作成
                for (const productType of productTypes) {
                    const title = `${imgData.idea.character} - ${imgData.idea.phrase}`;
                    const description = `Japanese culture design featuring ${imgData.idea.character}. ${imgData.idea.phrase}. Perfect souvenir from Japan!`;

                    const productResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/printify-create-product`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            shopId,
                            imageId,
                            title,
                            description,
                            tags: ['Japanese Culture', 'AI Generated', 'Batch Auto-Created'],
                            productType
                        })
                    });

                    if (!productResponse.ok) {
                        results.errors.push({
                            step: 'product_creation',
                            idea: imgData.idea.phrase,
                            productType,
                            error: `Creation failed: ${productResponse.status}`
                        });
                        continue;
                    }

                    const { productId, productName } = await productResponse.json();
                    results.products.push({
                        productId,
                        productName,
                        productType,
                        title
                    });
                    console.log(`  ✅ 商品作成成功: ${productName} (ID: ${productId})`);

                    // レート制限対策
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                results.errors.push({
                    step: 'product_creation',
                    idea: imgData.idea.phrase,
                    error: error.message
                });
            }
        }

        // 5. 自動公開（オプション）
        let publishedCount = 0;
        if (autoPublish && results.products.length > 0) {
            console.log('📤 商品を自動公開中...');
            const productIds = results.products.map(p => p.productId);

            try {
                const publishResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/printify-publish-products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        shopId,
                        productIds
                    })
                });

                if (publishResponse.ok) {
                    const publishResult = await publishResponse.json();
                    publishedCount = publishResult.published;
                    console.log(`✅ ${publishedCount}件の商品を公開しました`);
                }
            } catch (error) {
                console.error('❌ 自動公開エラー:', error.message);
                results.errors.push({
                    step: 'auto_publish',
                    error: error.message
                });
            }
        }

        // サマリー作成
        results.summary = {
            theme: selectedTheme,
            ideasGenerated: ideas.length,
            imagesGenerated: results.images.length,
            productsCreated: results.products.length,
            productsPublished: publishedCount,
            expectedProducts: ideas.length * productTypes.length,
            errorCount: results.errors.length,
            productTypes: productTypes,
            successRate: `${Math.round((results.products.length / (ideas.length * productTypes.length)) * 100)}%`
        };

        console.log('🎉 バッチ処理完了:', results.summary);

        res.status(200).json({
            success: true,
            message: 'バッチ処理が完了しました',
            results
        });

    } catch (error) {
        console.error('❌ バッチ処理エラー:', error);
        throw error;
    }
}

// レート制限: 1時間に1回まで（バッチ処理は重い）
export default rateLimitMiddleware(
    asyncHandler(handler),
    { maxRequests: 1, windowMs: 3600000 }
);
