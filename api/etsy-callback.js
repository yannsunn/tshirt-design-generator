// Etsy OAuth 2.0 コールバックエンドポイント
import { exchangeCodeForToken } from '../lib/etsyOAuth.js';
import cookie from 'cookie';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code, state, error, error_description } = req.query;
    const clientId = process.env.ETSY_API_KEY;
    const redirectUri = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/etsy-callback`;

    // エラーチェック
    if (error) {
        console.error('❌ Etsy OAuth エラー:', error, error_description);
        return res.status(400).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Etsy認証エラー</title>
                <meta charset="utf-8">
            </head>
            <body>
                <h1>❌ Etsy認証エラー</h1>
                <p><strong>エラー:</strong> ${error}</p>
                <p><strong>説明:</strong> ${error_description || '不明'}</p>
                <p><a href="/">トップページに戻る</a></p>
            </body>
            </html>
        `);
    }

    if (!code || !state) {
        return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    try {
        // クッキーからcode_verifierとstateを取得
        const cookies = cookie.parse(req.headers.cookie || '');
        const storedCodeVerifier = cookies.etsy_code_verifier;
        const storedState = cookies.etsy_state;

        if (!storedCodeVerifier || !storedState) {
            throw new Error('Missing code_verifier or state in cookies');
        }

        // CSRF対策: stateを検証
        if (state !== storedState) {
            throw new Error('Invalid state parameter - possible CSRF attack');
        }

        console.log('✅ State検証成功');

        // 認証コードをアクセストークンに交換
        const tokenData = await exchangeCodeForToken({
            clientId,
            redirectUri,
            code,
            codeVerifier: storedCodeVerifier
        });

        console.log('✅ Etsyアクセストークン取得成功');
        console.log(`   Access Token: ${tokenData.access_token.substring(0, 20)}...`);
        console.log(`   Expires in: ${tokenData.expires_in} seconds (${tokenData.expires_in / 3600} hours)`);
        console.log(`   Refresh Token: ${tokenData.refresh_token.substring(0, 20)}...`);

        // クッキーをクリア
        res.setHeader('Set-Cookie', [
            'etsy_code_verifier=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
            'etsy_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
        ]);

        // トークンを安全に保存（ここではHTMLで表示）
        // 本番環境では、Vercel KVやSupabaseに保存すべき
        res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Etsy認証成功</title>
                <meta charset="utf-8">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        max-width: 800px;
                        margin: 40px auto;
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    .container {
                        background: white;
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    h1 { color: #2ecc71; }
                    .token-box {
                        background: #f8f9fa;
                        border: 1px solid #dee2e6;
                        border-radius: 4px;
                        padding: 15px;
                        margin: 20px 0;
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        word-break: break-all;
                    }
                    .token-box strong {
                        color: #e74c3c;
                    }
                    .instructions {
                        background: #fff3cd;
                        border: 1px solid #ffc107;
                        border-radius: 4px;
                        padding: 15px;
                        margin: 20px 0;
                    }
                    .command {
                        background: #2c3e50;
                        color: #2ecc71;
                        padding: 10px;
                        border-radius: 4px;
                        font-family: 'Courier New', monospace;
                        margin: 10px 0;
                        overflow-x: auto;
                    }
                    button {
                        background: #3498db;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        margin-right: 10px;
                    }
                    button:hover {
                        background: #2980b9;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>✅ Etsy認証成功！</h1>

                    <p>Etsy OAuth 2.0認証が完了しました。以下のトークンを取得しました。</p>

                    <div class="token-box">
                        <strong>⚠️ 重要: これらのトークンは機密情報です。誰にも共有しないでください。</strong>
                    </div>

                    <h3>📋 アクセストークン</h3>
                    <div class="token-box" id="access-token">
                        ${tokenData.access_token}
                    </div>
                    <button onclick="copyToClipboard('access-token')">📋 コピー</button>
                    <p><small>有効期限: ${tokenData.expires_in}秒（${(tokenData.expires_in / 3600).toFixed(1)}時間）</small></p>

                    <h3>🔄 リフレッシュトークン</h3>
                    <div class="token-box" id="refresh-token">
                        ${tokenData.refresh_token}
                    </div>
                    <button onclick="copyToClipboard('refresh-token')">📋 コピー</button>
                    <p><small>有効期限: 90日</small></p>

                    <div class="instructions">
                        <h3>📝 次のステップ:</h3>
                        <ol>
                            <li><strong>Vercel環境変数に追加:</strong></li>
                        </ol>

                        <p>以下のコマンドを実行してください:</p>

                        <div class="command">
echo "${tokenData.access_token}" | vercel env add ETSY_ACCESS_TOKEN production
                        </div>

                        <div class="command">
echo "${tokenData.refresh_token}" | vercel env add ETSY_REFRESH_TOKEN production
                        </div>

                        <p><strong>注意:</strong> アクセストークンは1時間で期限切れになります。リフレッシュトークンを使って自動更新する仕組みが必要です。</p>
                    </div>

                    <p><a href="/">トップページに戻る</a></p>
                </div>

                <script>
                    function copyToClipboard(elementId) {
                        const text = document.getElementById(elementId).textContent.trim();
                        navigator.clipboard.writeText(text).then(() => {
                            alert('クリップボードにコピーしました！');
                        }).catch(err => {
                            console.error('コピー失敗:', err);
                            alert('コピーに失敗しました');
                        });
                    }
                </script>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('❌ Etsy OAuth コールバックエラー:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Etsy認証エラー</title>
                <meta charset="utf-8">
            </head>
            <body>
                <h1>❌ 認証処理エラー</h1>
                <p><strong>エラー:</strong> ${error.message}</p>
                <p><a href="/">トップページに戻る</a></p>
            </body>
            </html>
        `);
    }
}
