/**
 * Jest設定ファイル
 * 既存コードに影響を与えないテスト環境構築
 */

export default {
  // ESM対応
  testEnvironment: 'node',

  // テストファイルのパターン
  testMatch: [
    '**/tests/**/*.test.js'
  ],

  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // タイムアウト設定
  testTimeout: 30000,

  // カバレッジ設定
  collectCoverageFrom: [
    'api/**/*.js',
    '!api/**/*.backup.js',
    '!api/**/*.old.js',
    '!node_modules/**'
  ],

  // カバレッジレポート
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // モジュール変換
  transform: {},

  // ESM対応
  extensionsToTreatAsEsm: ['.js'],

  // モジュール解決
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  // 詳細出力
  verbose: true,

  // 並列実行（レート制限対策で無効化）
  maxWorkers: 1
};
