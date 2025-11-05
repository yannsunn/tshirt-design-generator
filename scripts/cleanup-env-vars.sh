#!/bin/bash
# 不要な環境変数を削除するスクリプト

echo "🗑️ 不要な環境変数を削除中..."

# eBay関連（全削除）
echo "削除中: eBay環境変数..."
vercel env rm EBAY_ENVIRONMENT production -y
vercel env rm EBAY_ENVIRONMENT preview -y
vercel env rm EBAY_ENVIRONMENT development -y
vercel env rm EBAY_PRODUCTION_CERT_ID production -y
vercel env rm EBAY_PRODUCTION_APP_ID production -y
vercel env rm EBAY_SANDBOX_CERT_ID preview -y
vercel env rm EBAY_SANDBOX_CERT_ID development -y
vercel env rm EBAY_SANDBOX_APP_ID preview -y
vercel env rm EBAY_SANDBOX_APP_ID development -y
vercel env rm EBAY_DEV_ID production -y
vercel env rm EBAY_DEV_ID preview -y
vercel env rm EBAY_DEV_ID development -y

# SUZURI関連（全削除）
echo "削除中: SUZURI環境変数..."
vercel env rm SUZURI_CLIENT_ID production -y
vercel env rm SUZURI_CLIENT_ID preview -y
vercel env rm SUZURI_CLIENT_ID development -y
vercel env rm SUZURI_CLIENT_SECRET production -y
vercel env rm SUZURI_CLIENT_SECRET preview -y
vercel env rm SUZURI_CLIENT_SECRET development -y
vercel env rm SUZURI_ACCESS_TOKEN production -y

# BASE関連（全削除）
echo "削除中: BASE環境変数..."
vercel env rm BASE_CLIENT_ID production -y
vercel env rm BASE_CLIENT_ID preview -y
vercel env rm BASE_CLIENT_ID development -y
vercel env rm BASE_CLIENT_SECRET production -y
vercel env rm BASE_CLIENT_SECRET preview -y
vercel env rm BASE_CLIENT_SECRET development -y
vercel env rm BASE_REFRESH_TOKEN production -y
vercel env rm BASE_REFRESH_TOKEN preview -y
vercel env rm BASE_REFRESH_TOKEN development -y
vercel env rm BASE_ACCESS_TOKEN production -y

# GELATO関連（全削除）
echo "削除中: GELATO環境変数..."
vercel env rm GELATO_API_KEY production -y
vercel env rm GELATO_API_KEY preview -y
vercel env rm GELATO_API_KEY development -y

echo "✅ 不要な環境変数の削除完了！"
echo ""
echo "残った環境変数を確認中..."
vercel env ls
