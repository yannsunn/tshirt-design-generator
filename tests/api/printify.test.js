/**
 * Printify API テスト
 * 商品作成・価格管理の動作確認
 */

import { describe, it, expect } from '@jest/globals';
import helpers from '../setup.js';

const API_BASE = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

describe('Printify Shops API', () => {
  it('should fetch shops list', async () => {
    const response = await fetch(`${API_BASE}/api/printify-get-shops`);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    // ショップ構造確認
    const shop = data[0];
    expect(shop).toHaveProperty('id');
    expect(shop).toHaveProperty('title');
  }, global.testTimeout);
});

describe('Printify Blueprints API', () => {
  it('should fetch blueprints list', async () => {
    const response = await fetch(`${API_BASE}/api/printify-get-blueprints`);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    // Blueprint構造確認
    const blueprint = data[0];
    expect(blueprint).toHaveProperty('id');
    expect(blueprint).toHaveProperty('title');
  }, global.testTimeout);
});

describe('Printify List Products API', () => {
  it('should list products from a shop', async () => {
    // まずショップIDを取得
    const shopsResponse = await fetch(`${API_BASE}/api/printify-get-shops`);
    const shops = await shopsResponse.json();
    const shopId = shops[0]?.id;

    if (!shopId) {
      console.warn('No shop found, skipping test');
      return;
    }

    await helpers.waitForRateLimit(500);

    const response = await fetch(
      `${API_BASE}/api/printify-list-products?shopId=${shopId}&limit=5`
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  }, global.testTimeout);
});

describe('Printify Price Calculation', () => {
  it('should calculate optimal prices', async () => {
    const response = await fetch(`${API_BASE}/api/printify-calculate-optimal-prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blueprintId: 6, // Gildan 5000
        targetMargin: 38
      })
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('prices');
    expect(typeof data.prices).toBe('object');
  }, global.testTimeout);
});

describe('Printify Price Check', () => {
  it('should check prices for all shops', async () => {
    const response = await fetch(`${API_BASE}/api/printify-check-prices`);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('summary');
    expect(data.summary).toHaveProperty('totalProducts');
  }, global.testTimeout * 3); // 価格チェックは時間がかかる
});
