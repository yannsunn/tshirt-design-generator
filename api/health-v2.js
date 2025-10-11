/**
 * ヘルスチェックAPI v2
 * ロガー統合版（既存のhealth.jsは変更せず、新バージョンとして作成）
 */

import { createLogger, createSuccessResponse, createErrorResponse } from '../lib/logger.js';

const logger = createLogger('health-v2');

export default async function handler(req, res) {
  const timer = logger.startTimer('health-check');

  try {
    if (req.method !== 'GET') {
      logger.warn('Method not allowed', { method: req.method });
      return res.status(405).json(
        createErrorResponse(logger, new Error('Method not allowed'), 405)
      );
    }

    // 環境変数チェック
    const config = {
      gemini: !!process.env.GEMINI_API_KEY,
      printify: !!process.env.PRINTIFY_API_KEY,
      supabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY,
      removebg: !!process.env.REMOVEBG_API_KEY,
      suzuri: !!process.env.SUZURI_ACCESS_TOKEN
    };

    // 警告チェック
    const warnings = [];
    if (!config.removebg) warnings.push('remove.bg not configured (optional)');
    if (!config.suzuri) warnings.push('SUZURI not configured (optional)');

    logger.info('Health check completed', {
      config,
      warnings: warnings.length > 0 ? warnings : undefined
    });

    const duration = timer.end();

    res.status(200).json(
      createSuccessResponse(
        {
          status: 'ok',
          ...config,
          warnings: warnings.length > 0 ? warnings : undefined
        },
        { responseTime: `${duration}ms` }
      )
    );
  } catch (error) {
    timer.end();
    res.status(500).json(createErrorResponse(logger, error));
  }
}
