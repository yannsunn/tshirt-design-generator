@echo off
REM 不要な環境変数を削除するスクリプト

echo 🗑️ 不要な環境変数を削除中...

REM eBay関連（全削除）
echo 削除中: eBay環境変数...
call vercel env rm EBAY_ENVIRONMENT production -y
call vercel env rm EBAY_ENVIRONMENT preview -y
call vercel env rm EBAY_ENVIRONMENT development -y
call vercel env rm EBAY_PRODUCTION_CERT_ID production -y
call vercel env rm EBAY_PRODUCTION_APP_ID production -y
call vercel env rm EBAY_SANDBOX_CERT_ID preview -y
call vercel env rm EBAY_SANDBOX_CERT_ID development -y
call vercel env rm EBAY_SANDBOX_APP_ID preview -y
call vercel env rm EBAY_SANDBOX_APP_ID development -y
call vercel env rm EBAY_DEV_ID production -y
call vercel env rm EBAY_DEV_ID preview -y
call vercel env rm EBAY_DEV_ID development -y

REM SUZURI関連（全削除）
echo 削除中: SUZURI環境変数...
call vercel env rm SUZURI_CLIENT_ID production -y
call vercel env rm SUZURI_CLIENT_ID preview -y
call vercel env rm SUZURI_CLIENT_ID development -y
call vercel env rm SUZURI_CLIENT_SECRET production -y
call vercel env rm SUZURI_CLIENT_SECRET preview -y
call vercel env rm SUZURI_CLIENT_SECRET development -y
call vercel env rm SUZURI_ACCESS_TOKEN production -y

REM BASE関連（全削除）
echo 削除中: BASE環境変数...
call vercel env rm BASE_CLIENT_ID production -y
call vercel env rm BASE_CLIENT_ID preview -y
call vercel env rm BASE_CLIENT_ID development -y
call vercel env rm BASE_CLIENT_SECRET production -y
call vercel env rm BASE_CLIENT_SECRET preview -y
call vercel env rm BASE_CLIENT_SECRET development -y
call vercel env rm BASE_REFRESH_TOKEN production -y
call vercel env rm BASE_REFRESH_TOKEN preview -y
call vercel env rm BASE_REFRESH_TOKEN development -y
call vercel env rm BASE_ACCESS_TOKEN production -y

REM GELATO関連（全削除）
echo 削除中: GELATO環境変数...
call vercel env rm GELATO_API_KEY production -y
call vercel env rm GELATO_API_KEY preview -y
call vercel env rm GELATO_API_KEY development -y

echo ✅ 不要な環境変数の削除完了！
echo.
echo 残った環境変数を確認中...
call vercel env ls

pause
