/**
 * レート制限機能テスト
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { getRateLimiter, withRateLimit, RateLimits, getAllUsage } from '../../lib/rate-limiter.js';

describe('Rate Limiter', () => {
  describe('Rate Limit Configuration', () => {
    it('should have rate limits for all APIs', () => {
      expect(RateLimits.GEMINI).toBeDefined();
      expect(RateLimits.PRINTIFY).toBeDefined();
      expect(RateLimits.SUZURI).toBeDefined();
      expect(RateLimits.REMOVEBG).toBeDefined();
    });

    it('should have valid configuration', () => {
      Object.values(RateLimits).forEach(config => {
        expect(config.requestsPerMinute).toBeDefined();
        expect(config.retryAfter).toBeGreaterThan(0);
        expect(config.maxRetries).toBeGreaterThan(0);
      });
    });
  });

  describe('RateLimiter Instance', () => {
    let limiter;

    beforeEach(() => {
      limiter = getRateLimiter('GEMINI');
    });

    it('should create rate limiter instance', () => {
      expect(limiter).toBeDefined();
      expect(limiter.apiName).toBe('GEMINI');
    });

    it('should allow requests within limit', async () => {
      await expect(limiter.checkLimit()).resolves.not.toThrow();
    });

    it('should track usage', async () => {
      await limiter.checkLimit();
      await limiter.checkLimit();

      const usage = limiter.getUsage();
      expect(usage.minute.used).toBeGreaterThanOrEqual(2);
      expect(usage.api).toBe('GEMINI');
    });
  });

  describe('withRateLimit Helper', () => {
    it('should execute function with rate limit check', async () => {
      let executed = false;

      await withRateLimit('GEMINI', async () => {
        executed = true;
        return 'success';
      });

      expect(executed).toBe(true);
    });

    it('should retry on failure', async () => {
      let attempts = 0;

      try {
        await withRateLimit('GEMINI', async () => {
          attempts++;
          if (attempts < 2) {
            throw new Error('Temporary error');
          }
          return 'success';
        }, 2); // 最大2回リトライ
      } catch (error) {
        // リトライ後に成功するはず
      }

      expect(attempts).toBeGreaterThanOrEqual(2);
    }, 10000);
  });

  describe('getAllUsage', () => {
    it('should return usage for all APIs', () => {
      const usage = getAllUsage();

      expect(Array.isArray(usage)).toBe(true);
      expect(usage.length).toBeGreaterThan(0);

      usage.forEach(apiUsage => {
        expect(apiUsage.api).toBeDefined();
      });
    });
  });
});

describe('Rate Limit Status API', () => {
  const API_BASE = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  it('should return rate limit status', async () => {
    const response = await fetch(`${API_BASE}/api/rate-limit-status`);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('success');
    expect(data.data).toHaveProperty('usage');
    expect(Array.isArray(data.data.usage)).toBe(true);
  }, global.testTimeout);

  it('should show API usage details', async () => {
    const response = await fetch(`${API_BASE}/api/rate-limit-status`);
    const data = await response.json();

    const usage = data.data.usage;
    expect(usage.length).toBeGreaterThan(0);

    // 各APIの情報確認
    usage.forEach(apiUsage => {
      expect(apiUsage).toHaveProperty('api');
      if (apiUsage.status !== 'not_used_yet') {
        expect(apiUsage).toHaveProperty('minute');
        expect(apiUsage).toHaveProperty('day');
      }
    });
  }, global.testTimeout);
});
