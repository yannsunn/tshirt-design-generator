// 商品再作成サービス
const { BLUEPRINT_TO_MASTER } = require('../config/blueprint-mapping');

async function fetchProductsFromShop(shopId, apiKey, offset, limit) {
    const page = Math.floor(offset / 100) + 1;
    const productsResponse = await fetch(
        `https://api.printify.com/v1/shops/${shopId}/products.json?limit=100&page=${page}`,
        {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!productsResponse.ok) {
        throw new Error(`Failed to fetch products: ${productsResponse.status}`);
    }

    const productsData = await productsResponse.json();
    const allProducts = productsData.data || [];

    // offsetとlimitで商品を絞り込み
    const startIndex = offset % 100;
    const targetProducts = allProducts.slice(startIndex, startIndex + limit);

    return { targetProducts, allProducts };
}

async function fetchProductDetail(shopId, productId, apiKey) {
    const detailResponse = await fetch(
        `https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`,
        {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!detailResponse.ok) {
        throw new Error(`Failed to fetch product detail: ${detailResponse.status}`);
    }

    return await detailResponse.json();
}

async function fetchMasterProduct(shopId, masterProductId, apiKey) {
    const masterResponse = await fetch(
        `https://api.printify.com/v1/shops/${shopId}/products/${masterProductId}.json`,
        {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!masterResponse.ok) {
        throw new Error(`Failed to fetch master: ${masterResponse.status}`);
    }

    return await masterResponse.json();
}

async function createProductFromMaster(shopId, apiKey, detail, master, existingImageId) {
    const newProduct = {
        title: detail.title,
        description: detail.description || 'Japanese-inspired design',
        blueprint_id: master.blueprint_id,
        print_provider_id: master.print_provider_id,
        variants: master.variants.map(v => ({
            id: v.id,
            price: v.price,
            is_enabled: v.is_enabled
        })),
        print_areas: master.print_areas.map(area => ({
            variant_ids: area.variant_ids,
            placeholders: area.placeholders.map(placeholder => ({
                position: placeholder.position,
                images: [
                    {
                        id: existingImageId, // 既存の画像IDを使用
                        x: placeholder.images[0]?.x || 0.5,
                        y: placeholder.images[0]?.y || 0.5,
                        scale: placeholder.images[0]?.scale || 1,
                        angle: placeholder.images[0]?.angle || 0
                    }
                ]
            }))
        }))
    };

    // タグを継承
    if (detail.tags && detail.tags.length > 0) {
        newProduct.tags = detail.tags;
    }

    // 新しい商品を作成
    const createResponse = await fetch(
        `https://api.printify.com/v1/shops/${shopId}/products.json`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newProduct)
        }
    );

    const createResponseText = await createResponse.text();

    if (!createResponse.ok) {
        throw new Error(`Failed to create product: ${createResponse.status} - ${createResponseText}`);
    }

    return JSON.parse(createResponseText);
}

async function deleteProduct(shopId, productId, apiKey) {
    const deleteResponse = await fetch(
        `https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`,
        {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        }
    );

    return deleteResponse.ok;
}

function shouldSkipProduct(product, blueprintId) {
    // [MASTER]商品はスキップ
    if (product.title && product.title.includes('[MASTER]')) {
        return { skip: true, reason: 'Master product' };
    }

    // 対応するマスター商品を確認
    if (!(blueprintId in BLUEPRINT_TO_MASTER)) {
        return { skip: true, reason: `Unsupported blueprint: ${blueprintId}` };
    }

    const masterProductId = BLUEPRINT_TO_MASTER[blueprintId];

    // 既存のカスタムBlueprint（706, 1296）はスキップ
    if (!masterProductId) {
        return { skip: true, reason: 'Custom master blueprint' };
    }

    return { skip: false, masterProductId };
}

module.exports = {
    fetchProductsFromShop,
    fetchProductDetail,
    fetchMasterProduct,
    createProductFromMaster,
    deleteProduct,
    shouldSkipProduct,
    BLUEPRINT_TO_MASTER
};
