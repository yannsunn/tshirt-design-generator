// Etsy OAuth 2.0 ヘルパー関数

import crypto from 'crypto';

/**
 * ランダムな文字列を生成（PKCE code_verifier用）
 * @param {number} length - 文字列の長さ（43-128）
 * @returns {string} URL-safeなランダム文字列
 */
export function generateCodeVerifier(length = 128) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
        result += characters[randomBytes[i] % characters.length];
    }

    return result;
}

/**
 * PKCE code_challengeを生成（code_verifierのSHA256ハッシュ）
 * @param {string} codeVerifier - code_verifier文字列
 * @returns {string} URL-safe Base64エンコードされたcode_challenge
 */
export function generateCodeChallenge(codeVerifier) {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    // URL-safe Base64エンコード
    return hash.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * ランダムなstate文字列を生成（CSRF対策）
 * @param {number} length - 文字列の長さ
 * @returns {string} ランダムなstate文字列
 */
export function generateState(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Etsy OAuth 2.0 認証URLを生成
 * @param {Object} params
 * @param {string} params.clientId - Etsy API Key
 * @param {string} params.redirectUri - コールバックURL
 * @param {string[]} params.scopes - 要求するスコープの配列
 * @param {string} params.state - state文字列
 * @param {string} params.codeChallenge - PKCE code_challenge
 * @returns {string} 認証URL
 */
export function buildAuthorizationUrl({ clientId, redirectUri, scopes, state, codeChallenge }) {
    const scopesString = scopes.join(' ');
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scopesString,
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
    });

    return `https://www.etsy.com/oauth/connect?${params.toString()}`;
}

/**
 * Etsy OAuth 2.0 アクセストークンを取得
 * @param {Object} params
 * @param {string} params.clientId - Etsy API Key
 * @param {string} params.redirectUri - コールバックURL
 * @param {string} params.code - 認証コード
 * @param {string} params.codeVerifier - PKCE code_verifier
 * @returns {Promise<Object>} トークン情報
 */
export async function exchangeCodeForToken({ clientId, redirectUri, code, codeVerifier }) {
    const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            redirect_uri: redirectUri,
            code: code,
            code_verifier: codeVerifier
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    // {
    //   "access_token": "12345678.O1zLuw...",
    //   "token_type": "Bearer",
    //   "expires_in": 3600,
    //   "refresh_token": "12345678.JNGIJt..."
    // }

    return data;
}

/**
 * Etsy OAuth 2.0 リフレッシュトークンで新しいアクセストークンを取得
 * @param {Object} params
 * @param {string} params.clientId - Etsy API Key
 * @param {string} params.refreshToken - リフレッシュトークン
 * @returns {Promise<Object>} 新しいトークン情報
 */
export async function refreshAccessToken({ clientId, refreshToken }) {
    const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: clientId,
            refresh_token: refreshToken
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
}
