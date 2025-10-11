/**
 * レート制限状況確認API
 * 全APIの現在の使用状況を確認
 */

import { getAllUsage } from '../lib/rate-limiter.js';
import { createLogger, createSuccessResponse } from '../lib/logger.js';

const logger = createLogger('rate-limit-status');

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const usage = getAllUsage();

    logger.info('Rate limit status checked', {
      totalAPIs: usage.length,
      activeAPIs: usage.filter(u => u.status !== 'not_used_yet').length
    });

    res.status(200).json(createSuccessResponse({ usage }));
  } catch (error) {
    logger.error('Failed to get rate limit status', error);
    res.status(500).json({ error: error.message });
  }
}
