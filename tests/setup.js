/**
 * テスト環境セットアップ
 * 既存コードに影響を与えず、テスト実行環境を構築
 */

import { config } from 'dotenv';

// 環境変数読み込み
config();

// テスト用の環境変数を設定
process.env.NODE_ENV = 'test';

// グローバルタイムアウト設定（30秒）
global.testTimeout = 30000;

// テスト用ヘルパー関数
export const helpers = {
  /**
   * API レスポンスの検証
   */
  validateApiResponse(response, expectedStatus = 200) {
    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected status ${expectedStatus}, got ${response.status}: ${JSON.stringify(response.data)}`
      );
    }
    return true;
  },

  /**
   * 環境変数の存在確認
   */
  checkRequiredEnvVars(varNames) {
    const missing = varNames.filter(name => !process.env[name]);
    if (missing.length > 0) {
      throw new Error(`Missing required env vars: ${missing.join(', ')}`);
    }
    return true;
  },

  /**
   * レート制限を考慮した待機
   */
  async waitForRateLimit(ms = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * テストデータ生成
   */
  generateTestDesign() {
    return {
      theme: 'テスト用富士山',
      character: '富士山と桜の和風デザイン',
      phrase: 'テスト用フレーズ',
      fontStyle: 'pop'
    };
  }
};

export default helpers;
