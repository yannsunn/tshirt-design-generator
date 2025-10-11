/**
 * レート制限管理ユーティリティ
 * 各外部APIのレート制限を統一的に管理
 */

import { createLogger } from './logger.js';

const logger = createLogger('rate-limiter');

/**
 * API別のレート制限設定
 */
export const RateLimits = {
  // Gemini API
  GEMINI: {
    requestsPerMinute: 60,
    requestsPerDay: 1500,
    retryAfter: 1000, // 1秒
    maxRetries: 3
  },

  // Printify API
  PRINTIFY: {
    requestsPerMinute: 90,
    requestsPerDay: null, // 無制限
    retryAfter: 1000,
    maxRetries: 3
  },

  // SUZURI API
  SUZURI: {
    requestsPerMinute: 5,
    requestsPerDay: null,
    retryAfter: 12000, // 12秒（5req/min = 12秒間隔）
    maxRetries: 2
  },

  // remove.bg API
  REMOVEBG: {
    requestsPerMinute: 60,
    requestsPerDay: null,
    retryAfter: 1000,
    maxRetries: 2
  }
};

/**
 * レート制限トラッカー
 */
class RateLimiter {
  constructor(apiName, config) {
    this.apiName = apiName;
    this.config = config;
    this.requests = {
      minute: [],
      day: []
    };
  }

  /**
   * リクエスト実行前のチェック
   */
  async checkLimit() {
    const now = Date.now();

    // 古いリクエスト記録を削除
    this._cleanupOldRequests(now);

    // 分単位のチェック
    if (this.config.requestsPerMinute) {
      const minuteCount = this.requests.minute.length;
      if (minuteCount >= this.config.requestsPerMinute) {
        const waitTime = this._calculateWaitTime();
        logger.warn(`${this.apiName} rate limit reached (minute)`, {
          current: minuteCount,
          limit: this.config.requestsPerMinute,
          waitTime
        });
        throw new Error(`Rate limit exceeded. Wait ${waitTime}ms`);
      }
    }

    // 日単位のチェック
    if (this.config.requestsPerDay) {
      const dayCount = this.requests.day.length;
      if (dayCount >= this.config.requestsPerDay) {
        logger.error(`${this.apiName} daily rate limit exceeded`, {
          current: dayCount,
          limit: this.config.requestsPerDay
        });
        throw new Error('Daily rate limit exceeded');
      }
    }

    // リクエスト記録
    this.requests.minute.push(now);
    this.requests.day.push(now);

    logger.debug(`${this.apiName} rate limit check passed`, {
      minuteUsage: this.requests.minute.length,
      dayUsage: this.requests.day.length
    });
  }

  /**
   * 古いリクエスト記録を削除
   */
  _cleanupOldRequests(now) {
    const oneMinuteAgo = now - 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    this.requests.minute = this.requests.minute.filter(t => t > oneMinuteAgo);
    this.requests.day = this.requests.day.filter(t => t > oneDayAgo);
  }

  /**
   * 待機時間を計算
   */
  _calculateWaitTime() {
    if (this.requests.minute.length === 0) return 0;

    const oldestRequest = this.requests.minute[0];
    const oneMinuteAgo = Date.now() - 60 * 1000;
    return Math.max(0, oldestRequest - oneMinuteAgo + 1000);
  }

  /**
   * 現在の使用状況を取得
   */
  getUsage() {
    this._cleanupOldRequests(Date.now());

    return {
      api: this.apiName,
      minute: {
        used: this.requests.minute.length,
        limit: this.config.requestsPerMinute,
        percentage: this.config.requestsPerMinute
          ? (this.requests.minute.length / this.config.requestsPerMinute * 100).toFixed(1)
          : null
      },
      day: {
        used: this.requests.day.length,
        limit: this.config.requestsPerDay,
        percentage: this.config.requestsPerDay
          ? (this.requests.day.length / this.config.requestsPerDay * 100).toFixed(1)
          : null
      }
    };
  }
}

/**
 * API別のレートリミッターインスタンス
 */
const limiters = {};

/**
 * レートリミッター取得
 */
export function getRateLimiter(apiName) {
  if (!limiters[apiName]) {
    const config = RateLimits[apiName];
    if (!config) {
      throw new Error(`Unknown API: ${apiName}`);
    }
    limiters[apiName] = new RateLimiter(apiName, config);
  }
  return limiters[apiName];
}

/**
 * レート制限付きリトライ
 */
export async function withRateLimit(apiName, fn, retries = null) {
  const limiter = getRateLimiter(apiName);
  const maxRetries = retries ?? limiter.config.maxRetries;
  const retryAfter = limiter.config.retryAfter;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // レート制限チェック
      await limiter.checkLimit();

      // 実行
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      // レート制限エラー
      if (error.message.includes('Rate limit')) {
        if (!isLastAttempt) {
          logger.warn(`${apiName} rate limit, retrying in ${retryAfter}ms`, {
            attempt: attempt + 1,
            maxRetries
          });
          await sleep(retryAfter);
          continue;
        }
      }

      // 429エラー（Too Many Requests）
      if (error.response?.status === 429) {
        if (!isLastAttempt) {
          const waitTime = error.response.headers?.['retry-after']
            ? parseInt(error.response.headers['retry-after']) * 1000
            : retryAfter;

          logger.warn(`${apiName} 429 error, retrying in ${waitTime}ms`, {
            attempt: attempt + 1,
            maxRetries
          });
          await sleep(waitTime);
          continue;
        }
      }

      // その他のエラー
      if (!isLastAttempt) {
        logger.warn(`${apiName} request failed, retrying`, {
          attempt: attempt + 1,
          maxRetries,
          error: error.message
        });
        await sleep(retryAfter);
        continue;
      }

      // 最終試行で失敗
      logger.error(`${apiName} request failed after ${maxRetries} retries`, error);
      throw error;
    }
  }
}

/**
 * 全APIの使用状況を取得
 */
export function getAllUsage() {
  return Object.keys(RateLimits).map(apiName => {
    if (limiters[apiName]) {
      return limiters[apiName].getUsage();
    }
    return {
      api: apiName,
      status: 'not_used_yet'
    };
  });
}

/**
 * 待機ヘルパー
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  RateLimits,
  getRateLimiter,
  withRateLimit,
  getAllUsage
};
