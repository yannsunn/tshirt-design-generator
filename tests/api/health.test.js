/**
 * ヘルスチェックAPI テスト
 * システムの基本的な動作確認
 */

import { describe, it, expect } from '@jest/globals';
import helpers from '../setup.js';

const API_BASE = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

describe('Health Check API', () => {
  it('should return 200 OK', async () => {
    const response = await fetch(`${API_BASE}/api/health`);
    expect(response.status).toBe(200);
  }, global.testTimeout);

  it('should return valid JSON', async () => {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();

    expect(data).toHaveProperty('status');
    expect(data.status).toBe('ok');
  }, global.testTimeout);

  it('should check environment variables', async () => {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();

    expect(data).toHaveProperty('gemini');
    expect(data).toHaveProperty('printify');
    expect(data).toHaveProperty('supabase');
  }, global.testTimeout);
});

describe('Critical Environment Variables', () => {
  it('should have GEMINI_API_KEY', () => {
    expect(process.env.GEMINI_API_KEY).toBeDefined();
  });

  it('should have PRINTIFY_API_KEY', () => {
    expect(process.env.PRINTIFY_API_KEY).toBeDefined();
  });

  it('should have SUPABASE_URL', () => {
    expect(process.env.SUPABASE_URL).toBeDefined();
  });

  it('should have SUPABASE_ANON_KEY', () => {
    expect(process.env.SUPABASE_ANON_KEY).toBeDefined();
  });
});
