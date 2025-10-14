// 商品取得サービス

async function getAllStorefrontProducts(shopId) {
    try {
        console.log('📋 Storefront商品一覧を取得中...');

        const products = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const url = `https://design-generator-puce.vercel.app/api/printify-list-products?shopId=${shopId}&page=${page}&limit=50`;
            console.log(`  🔗 Fetching: ${url}`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log(`  📡 Response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`  ❌ Error response: ${errorText.substring(0, 200)}`);
                throw new Error(`商品取得失敗: HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log(`  ✅ Data received: products=${data.products?.length}, currentPage=${data.currentPage}, lastPage=${data.lastPage}`);
            const pageProducts = data.products || [];

            products.push(...pageProducts);

            console.log(`  📄 ページ${page}: ${pageProducts.length}商品取得`);

            hasMore = data.currentPage < data.lastPage;
            page++;

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`✅ 合計 ${products.length}商品を取得\n`);
        return products;

    } catch (error) {
        console.error('❌ 商品取得エラー:', error.message);
        return [];
    }
}

module.exports = {
    getAllStorefrontProducts
};
