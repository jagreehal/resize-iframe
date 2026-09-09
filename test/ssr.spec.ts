import { expect, test } from '@playwright/test';

test.describe('SSR-safe imports', () => {
  test('main entry loads in Node and exports iframeResize', async () => {
    const mod = await import('../resize-iframe.js');
    expect(typeof mod.iframeResize).toBe('function');
  });

  test('element entry is a no-op in Node', async () => {
    await expect(import('../element.js')).resolves.toBeDefined();
  });
});
