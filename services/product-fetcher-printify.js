// Printify商品取得サービス

/**
 * 商品リストを取得（ページネーション対応）
 * @param {string} shopId - ショップID
 * @param {string} apiKey - Printify API Key
 * @param {number} page - ページ番号
 * @param {number} limit - 1ページあたりの商品数（デフォルト50）
 * @returns {Promise<Object>} { products, currentPage, lastPage }
 */
async function fetchProductsPage(shopId, apiKey, page = 1, limit = 50) {
    const response = await fetch(
        `https://api.printify.com/v1/shops/${shopId}/products.json?limit=${limit}&page=${page}`,
        {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch products (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return {
        products: data.data || [],
        currentPage: data.current_page,
        lastPage: data.last_page
    };
}

/**
 * 全商品を取得（全ページを自動取得）
 * @param {string} shopId - ショップID
 * @param {string} apiKey - Printify API Key
 * @param {Object} options - オプション { onPageFetched: コールバック関数 }
 * @returns {Promise<Array>} 全商品の配列
 */
async function fetchAllProducts(shopId, apiKey, options = {}) {
    let allProducts = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
        const { products, lastPage } = await fetchProductsPage(shopId, apiKey, currentPage);
        allProducts = allProducts.concat(products);

        if (options.onPageFetched) {
            options.onPageFetched(currentPage, products.length, allProducts.length);
        }

        hasMorePages = products.length === 50;
        currentPage++;

        // レート制限対策
        if (hasMorePages) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    return allProducts;
}

/**
 * 商品詳細を取得
 * @param {string} shopId - ショップID
 * @param {string} productId - 商品ID
 * @param {string} apiKey - Printify API Key
 * @returns {Promise<Object>} 商品詳細
 */
async function fetchProductDetail(shopId, productId, apiKey) {
    const response = await fetch(
        `https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`,
        {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch product detail (${response.status}): ${errorText}`);
    }

    return await response.json();
}

/**
 * 商品を更新
 * @param {string} shopId - ショップID
 * @param {string} productId - 商品ID
 * @param {string} apiKey - Printify API Key
 * @param {Object} updateData - 更新データ
 * @returns {Promise<Object>} 更新後の商品データ
 */
async function updateProduct(shopId, productId, apiKey, updateData) {
    const response = await fetch(
        `https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update product (${response.status}): ${errorText}`);
    }

    return await response.json();
}

/**
 * バッチ処理用に商品を取得（offsetとlimit対応）
 * @param {string} shopId - ショップID
 * @param {string} apiKey - Printify API Key
 * @param {number} offset - オフセット
 * @param {number} limit - 取得数
 * @returns {Promise<Object>} { products, hasMore, nextOffset, totalEstimate }
 */
async function fetchProductsBatch(shopId, apiKey, offset = 0, limit = 8) {
    const page = Math.floor(offset / 50) + 1;
    const { products: allPageProducts, lastPage } = await fetchProductsPage(shopId, apiKey, page);

    const startIndex = offset % 50;
    const products = allPageProducts.slice(startIndex, startIndex + limit);
    const totalEstimate = lastPage * 50;
    const hasMore = offset + limit < totalEstimate;

    return {
        products,
        hasMore,
        nextOffset: offset + limit,
        totalEstimate
    };
}

export {
    fetchProductsPage,
    fetchAllProducts,
    fetchProductDetail,
    updateProduct,
    fetchProductsBatch
};
