// Printify商品作成（マスター複製方式）
// モックアップ・配送設定を保持したまま、画像・タイトル・説明だけを差し替え

import { calculateVariantPrice } from '../lib/blueprintCosts.js';
import { asyncHandler } from '../lib/errorHandler.js';
import { rateLimitMiddleware } from '../lib/rateLimiter.js';
import { fetchWithTimeout, fetchJSON } from '../lib/fetchWithTimeout.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('printify-create-product');

// ショップごとのマスター商品IDマッピング（2025-10-13 更新）
const MASTER_PRODUCTS_BY_SHOP = {
    // Storefront (24565480)
    '24565480': {
        tshirt: '68eb804da0786662a60357d9',              // Blueprint 6: Gildan 5000
        lightweight_tee: '68eb8052aa2890fa97097970',    // Blueprint 26: Gildan 980
        ultra_cotton_tee: '68eb8054a0786662a60357da',   // Blueprint 36: Gildan 2000
        softstyle_tee: '68eb8059aa2890fa97097974',      // Blueprint 145: Gildan 64000
        kids_tee: '68eb805da0c8ed2f2c0f0314',           // Blueprint 157: Gildan 5000B
        longsleeve: '68eb8060ff3c0ac2d50ebd3f',         // Blueprint 80: Gildan 2400
        sweatshirt: '68eb8063a0786662a60357dd',         // Blueprint 49: Gildan 18000
        hoodie: '68eb8068cb19b441780df848'              // Blueprint 77: Gildan 18500
    },
    // Etsy (24566474) - 2025-10-13 作成
    '24566474': {
        tshirt: '68ecbc2d9b2784f69609fbb2',              // Blueprint 6: Gildan 5000
        lightweight_tee: '68ecbc3450cf7a91a708a955',    // Blueprint 26: Gildan 980
        ultra_cotton_tee: '68ecbc38a70adcc57007a702',   // Blueprint 36: Gildan 2000
        softstyle_tee: '68ecbc3ebe92a956c70d0fef',      // Blueprint 145: Gildan 64000
        kids_tee: '68ecbc2450cf7a91a708a950',           // Blueprint 157: Gildan 5000B
        longsleeve: '68ecbc1fc26025d416096772',         // Blueprint 80: Gildan 2400
        sweatshirt: '68ecbc15c26025d416096770',         // Blueprint 49: Gildan 18000
        hoodie: '68ecbc1250cf7a91a708a948'              // Blueprint 77: Gildan 18500
    }
};

const ALLOWED_PRODUCT_TYPES = ['tshirt', 'lightweight_tee', 'ultra_cotton_tee', 'softstyle_tee', 'kids_tee', 'longsleeve', 'sweatshirt', 'hoodie'];
const AUTO_PUBLISH_SHOPS = ['24565480']; // Storefront
const SHOP_PREFIXES = {
    '24565480': 'STF',  // Storefront
    '24566474': 'ETY'   // Etsy
};

/**
 * マスター商品を取得
 */
async function fetchMasterProduct(shopId, masterProductId, apiKey) {
    const timer = logger.startTimer('fetch-master-product');
    logger.info('Fetching master product', { shopId, masterProductId });

    const master = await fetchJSON(
        `https://api.printify.com/v1/shops/${shopId}/products/${masterProductId}.json`,
        {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        },
        10000
    );

    timer.end();
    logger.info('Master product fetched', {
        title: master.title,
        blueprintId: master.blueprint_id
    });

    return master;
}

/**
 * 画像をPrintifyにアップロード
 */
async function uploadImage(imageUrl, apiKey) {
    const timer = logger.startTimer('upload-image');
    logger.info('Uploading image', { imageUrl: imageUrl.substring(0, 50) });

    const uploadedImage = await fetchJSON(
        `https://api.printify.com/v1/uploads/images.json`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_name: `design_${Date.now()}.png`,
                url: imageUrl
            })
        },
        15000
    );

    timer.end();
    logger.info('Image uploaded', { imageId: uploadedImage.id });

    return uploadedImage.id;
}

/**
 * 新しい商品データを作成
 */
function buildProductData(master, newImageId, title, description, tags, productType, shopId) {
    const newProduct = {
        title: title,
        description: description || master.description || 'Japanese-inspired design',
        blueprint_id: master.blueprint_id,
        print_provider_id: master.print_provider_id,
        variants: master.variants.map(v => {
            const optimalPrice = calculateVariantPrice(master.blueprint_id, v.title || '');
            return {
                id: v.id,
                price: optimalPrice || v.price,
                is_enabled: v.is_enabled
            };
        }),
        print_areas: master.print_areas.map(area => {
            const frontPlaceholders = area.placeholders
                .filter(placeholder => placeholder.position === 'front' && placeholder.images && placeholder.images.length > 0)
                .map(placeholder => ({
                    position: placeholder.position,
                    images: [
                        {
                            id: newImageId,
                            x: placeholder.images[0]?.x || 0.5,
                            y: placeholder.images[0]?.y || 0.5,
                            scale: placeholder.images[0]?.scale || 1,
                            angle: placeholder.images[0]?.angle || 0
                        }
                    ]
                }));

            return {
                variant_ids: area.variant_ids,
                placeholders: frontPlaceholders
            };
        }).filter(area => area.placeholders.length > 0)
    };

    if (tags && tags.length > 0) {
        newProduct.tags = tags;
    }

    // SKU生成
    const sku = `${SHOP_PREFIXES[shopId] || 'UNK'}-${productType.toUpperCase()}-${Date.now()}`;
    newProduct.variants = newProduct.variants.map((v, index) => ({
        ...v,
        sku: `${sku}-${index + 1}`
    }));

    newProduct.is_printify_express_enabled = true;

    logger.info('Product data built', { sku, variants: newProduct.variants.length });

    return newProduct;
}

/**
 * 商品を作成
 */
async function createProduct(shopId, productData, apiKey) {
    const timer = logger.startTimer('create-product');
    logger.info('Creating product', { shopId, title: productData.title });

    const response = await fetchWithTimeout(
        `https://api.printify.com/v1/shops/${shopId}/products.json`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        },
        20000
    );

    if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
            errorData = JSON.parse(errorText);
        } catch {
            errorData = { message: errorText };
        }

        logger.error('Product creation failed', new Error(`HTTP ${response.status}`), {
            status: response.status,
            error: errorData
        });

        throw new Error(`Failed to create product: ${JSON.stringify(errorData)}`);
    }

    const createdProduct = await response.json();
    timer.end();
    logger.info('Product created', { productId: createdProduct.id, title: createdProduct.title });

    return createdProduct;
}

/**
 * 商品を公開（Storefrontのみ）
 */
async function publishProduct(shopId, productId, apiKey) {
    if (!AUTO_PUBLISH_SHOPS.includes(shopId)) {
        logger.info('Skipping auto-publish for this shop', { shopId });
        return 'draft';
    }

    try {
        const timer = logger.startTimer('publish-product');
        logger.info('Publishing product', { shopId, productId });

        const response = await fetchWithTimeout(
            `https://api.printify.com/v1/shops/${shopId}/products/${productId}/publish.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: true,
                    description: true,
                    images: true,
                    variants: true,
                    tags: true,
                    keyFeatures: true,
                    shipping_template: true
                })
            },
            15000
        );

        if (response.ok) {
            await response.json();
            timer.end();
            logger.info('Product published', { productId });
            return 'published';
        } else {
            const publishError = await response.text();
            logger.warn('Product publish failed', { productId, error: publishError.substring(0, 200) });
            return 'publish_failed';
        }
    } catch (publishError) {
        logger.error('Publish error', publishError, { productId });
        return 'publish_error';
    }
}

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            shopId,
            imageId,
            imageUrl,
            title,
            description,
            tags,
            productType = 'tshirt',
            designTheme = null
        } = req.body;

        const apiKey = process.env.PRINTIFY_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'PRINTIFY_API_KEY is not configured' });
        }

        // Validation
        if (!shopId || (!imageId && !imageUrl) || !title) {
            return res.status(400).json({ error: 'shopId, (imageId or imageUrl), and title are required' });
        }

        if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
            return res.status(400).json({ error: 'imageUrl must be an HTTPS URL' });
        }

        if (tags !== undefined) {
            if (!Array.isArray(tags)) {
                return res.status(400).json({ error: 'tags must be an array' });
            }
            if (!tags.every(tag => typeof tag === 'string' && tag.length > 0 && tag.length <= 40)) {
                return res.status(400).json({ error: 'All tags must be non-empty strings with max 40 characters' });
            }
        }

        if (!ALLOWED_PRODUCT_TYPES.includes(productType)) {
            return res.status(400).json({ error: `Invalid productType. Allowed values: ${ALLOWED_PRODUCT_TYPES.join(', ')}` });
        }

        // Get master product ID
        const masterProductIds = MASTER_PRODUCTS_BY_SHOP[shopId];
        if (!masterProductIds) {
            const availableShops = Object.keys(MASTER_PRODUCTS_BY_SHOP).join(', ');
            logger.error('Shop not found in master mapping', null, { shopId, availableShops });
            return res.status(400).json({
                error: `Shop ${shopId} のマスター商品が未設定です。利用可能なショップ: ${availableShops}`,
                availableShops: Object.keys(MASTER_PRODUCTS_BY_SHOP)
            });
        }

        const masterProductId = masterProductIds[productType];
        if (!masterProductId) {
            const validTypes = Object.keys(masterProductIds).join(', ');
            return res.status(400).json({
                error: `Invalid productType: ${productType}. Valid types: ${validTypes}`
            });
        }

        logger.info('Starting product creation', {
            shopId,
            productType,
            masterProductId,
            title: title.substring(0, 50)
        });

        // Step 1: Fetch master product
        const master = await fetchMasterProduct(shopId, masterProductId, apiKey);

        // Step 2: Get or upload image
        let newImageId;
        if (imageId) {
            newImageId = imageId;
            logger.info('Using existing image ID', { imageId: newImageId });
        } else if (imageUrl) {
            newImageId = await uploadImage(imageUrl, apiKey);
        } else {
            throw new Error('Either imageId or imageUrl must be provided');
        }

        // Step 3: Build product data
        const productData = buildProductData(master, newImageId, title, description, tags, productType, shopId);

        // Step 4: Create product
        const createdProduct = await createProduct(shopId, productData, apiKey);

        // Step 5: Auto-publish (Storefront only)
        const publishStatus = await publishProduct(shopId, createdProduct.id, apiKey);

        const response = {
            success: true,
            productId: createdProduct.id,
            title: createdProduct.title,
            blueprintId: createdProduct.blueprint_id,
            printProviderId: createdProduct.print_provider_id,
            variants: createdProduct.variants?.length || 0,
            imageId: newImageId,
            masterProductId: masterProductId,
            productType: productType,
            publishStatus: publishStatus,
            message: `✅ マスターから商品を作成しました: ${createdProduct.title}${publishStatus === 'published' ? ' (公開済み)' : ''}`
        };

        logger.info('Product creation completed', {
            productId: createdProduct.id,
            publishStatus
        });

        res.status(200).json(response);

    } catch (error) {
        logger.error('Product creation failed', error, {
            shopId: req.body?.shopId,
            productType: req.body?.productType,
            title: req.body?.title?.substring(0, 50)
        });

        const isProd = process.env.NODE_ENV === 'production';
        return res.status(500).json({
            error: isProd ? 'Internal server error' : (error.message || 'Internal server error')
        });
    }
}

// Apply rate limiting: 20 requests per minute per client (product creation is complex)
export default rateLimitMiddleware(asyncHandler(handler), {
    maxRequests: 20,
    windowMs: 60000
});
