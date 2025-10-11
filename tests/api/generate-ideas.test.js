/**
 * アイデア生成API テスト
 * 重複管理・Supabase連携の動作確認
 */

import { describe, it, expect } from '@jest/globals';
import helpers from '../setup.js';

const API_BASE = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

describe('Generate Ideas API', () => {
  it('should generate ideas for a theme', async () => {
    const response = await fetch(`${API_BASE}/api/generate-ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: '富士山と桜',
        productTypes: ['tshirt']
      })
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('ideas');
    expect(Array.isArray(data.ideas)).toBe(true);
    expect(data.ideas.length).toBeGreaterThan(0);

    // アイデアの構造確認
    const idea = data.ideas[0];
    expect(idea).toHaveProperty('character');
    expect(idea).toHaveProperty('phrase');
    expect(idea).toHaveProperty('fontStyle');
  }, global.testTimeout);

  it('should handle invalid theme', async () => {
    const response = await fetch(`${API_BASE}/api/generate-ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: '', // 空のテーマ
        productTypes: ['tshirt']
      })
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
  }, global.testTimeout);

  it('should respect product type filtering', async () => {
    const response = await fetch(`${API_BASE}/api/generate-ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: '侍',
        productTypes: ['tshirt', 'sweatshirt']
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ideas.length).toBeGreaterThan(0);
  }, global.testTimeout);
});

describe('Idea History Integration', () => {
  it('should save ideas to Supabase', async () => {
    const testTheme = `テスト_${Date.now()}`;

    const response = await fetch(`${API_BASE}/api/generate-ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: testTheme,
        productTypes: ['tshirt']
      })
    });

    expect(response.status).toBe(200);

    // 少し待機してから履歴確認
    await helpers.waitForRateLimit(2000);

    const historyResponse = await fetch(
      `${API_BASE}/api/get-idea-history?theme=${encodeURIComponent(testTheme)}`
    );

    expect(historyResponse.status).toBe(200);
    const historyData = await historyResponse.json();
    expect(historyData).toHaveProperty('history');
  }, global.testTimeout * 2);
});
