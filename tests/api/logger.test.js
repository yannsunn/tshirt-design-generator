/**
 * ロガー機能テスト
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createLogger, createErrorResponse, createSuccessResponse, LogLevel } from '../../lib/logger.js';

describe('Logger Utility', () => {
  let logger;
  let consoleOutput;

  beforeEach(() => {
    logger = createLogger('test-context');
    consoleOutput = [];

    // コンソール出力をキャプチャ
    jest.spyOn(console, 'log').mockImplementation(msg => consoleOutput.push(msg));
    jest.spyOn(console, 'error').mockImplementation(msg => consoleOutput.push(msg));
    jest.spyOn(console, 'warn').mockImplementation(msg => consoleOutput.push(msg));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Logging', () => {
    it('should log INFO messages', () => {
      logger.info('Test info message', { key: 'value' });

      expect(consoleOutput.length).toBe(1);
      const log = JSON.parse(consoleOutput[0]);

      expect(log.level).toBe(LogLevel.INFO);
      expect(log.message).toBe('Test info message');
      expect(log.context).toBe('test-context');
      expect(log.key).toBe('value');
      expect(log.timestamp).toBeDefined();
    });

    it('should log ERROR messages with error object', () => {
      const error = new Error('Test error');
      logger.error('Something went wrong', error);

      expect(consoleOutput.length).toBe(1);
      const log = JSON.parse(consoleOutput[0]);

      expect(log.level).toBe(LogLevel.ERROR);
      expect(log.message).toBe('Something went wrong');
      expect(log.error).toBeDefined();
      expect(log.error.message).toBe('Test error');
      expect(log.error.stack).toBeDefined();
    });

    it('should log WARN messages', () => {
      logger.warn('Test warning', { severity: 'medium' });

      expect(consoleOutput.length).toBe(1);
      const log = JSON.parse(consoleOutput[0]);

      expect(log.level).toBe(LogLevel.WARN);
      expect(log.severity).toBe('medium');
    });
  });

  describe('API Call Logging', () => {
    it('should log API calls with metrics', () => {
      logger.apiCall('GET', '/api/test', 123, 200, { userId: 'test-user' });

      expect(consoleOutput.length).toBe(1);
      const log = JSON.parse(consoleOutput[0]);

      expect(log.method).toBe('GET');
      expect(log.url).toBe('/api/test');
      expect(log.duration).toBe(123);
      expect(log.status).toBe(200);
      expect(log.userId).toBe('test-user');
    });
  });

  describe('Timer', () => {
    it('should measure execution time', async () => {
      const timer = logger.startTimer('test-operation');

      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 100));

      timer.end({ result: 'success' });

      expect(consoleOutput.length).toBe(1);
      const log = JSON.parse(consoleOutput[0]);

      expect(log.message).toBe('Timer: test-operation');
      expect(log.duration).toBeGreaterThanOrEqual(100);
      expect(log.result).toBe('success');
    });
  });

  describe('Response Helpers', () => {
    it('should create success response', () => {
      const response = createSuccessResponse({ id: 1, name: 'Test' }, { count: 5 });

      expect(response.status).toBe('success');
      expect(response.data).toEqual({ id: 1, name: 'Test' });
      expect(response.count).toBe(5);
    });

    it('should create error response', () => {
      const error = new Error('Test error');
      const response = createErrorResponse(logger, error, 400);

      expect(response.status).toBe('error');
      expect(response.message).toBe('Test error');

      // エラーログが出力されている
      expect(consoleOutput.length).toBe(1);
      const log = JSON.parse(consoleOutput[0]);
      expect(log.level).toBe(LogLevel.ERROR);
      expect(log.statusCode).toBe(400);
    });
  });
});

describe('Health API v2', () => {
  const API_BASE = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  it('should return structured response with logger', async () => {
    const response = await fetch(`${API_BASE}/api/health-v2`);

    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data).toHaveProperty('status');
    expect(data.status).toBe('success');
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('responseTime');

    // データ構造確認
    expect(data.data).toHaveProperty('gemini');
    expect(data.data).toHaveProperty('printify');
    expect(data.data).toHaveProperty('supabase');
  }, global.testTimeout);
});
