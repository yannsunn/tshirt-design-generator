// Etsy OAuth 2.0 認証開始エンドポイント
import { generateCodeVerifier, generateCodeChallenge, generateState, buildAuthorizationUrl } from '../lib/etsyOAuth.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const clientId = process.env.ETSY_API_KEY;
    const redirectUri = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/etsy-callback`;

    if (!clientId) {
        return res.status(500).json({ error: 'ETSY_API_KEY is not configured' });
    }

    try {
        // PKCE code_verifierとcode_challengeを生成
        const codeVerifier = generateCodeVerifier(128);
        const codeChallenge = generateCodeChallenge(codeVerifier);

        // CSRF対策用のstate文字列を生成
        const state = generateState(32);

        // 要求するスコープ
        const scopes = [
            'listings_r',    // リスティング読み取り
            'listings_w',    // リスティング作成・編集
            'shops_r',       // ショップ情報読み取り
            'shops_w'        // ショップ情報更新
        ];

        // OAuth認証URLを生成
        const authUrl = buildAuthorizationUrl({
            clientId,
            redirectUri,
            scopes,
            state,
            codeChallenge
        });

        // code_verifierとstateをクッキーに保存（セキュア）
        // 注: Vercelの制限により、クッキーサイズは4KBまで
        res.setHeader('Set-Cookie', [
            `etsy_code_verifier=${codeVerifier}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
            `etsy_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
        ]);

        console.log('✅ Etsy OAuth認証開始');
        console.log(`   Redirect URI: ${redirectUri}`);
        console.log(`   Scopes: ${scopes.join(', ')}`);

        // 認証ページにリダイレクト
        res.redirect(authUrl);

    } catch (error) {
        console.error('❌ Etsy OAuth認証エラー:', error);
        res.status(500).json({ error: error.message });
    }
}
