import { expect, test } from '@playwright/test';
import { events, eventTypes, openParent, styleInChild } from './helpers';

test.describe('messaging and lifecycle', () => {
  test('fires onReady once, however many resizes follow', async ({ page }) => {
    const frame = await openParent(page);
    await expect(frame).toHaveCSS('height', '300px');

    await styleInChild(page, '#box', { height: '400px' });
    await expect(frame).toHaveCSS('height', '400px');

    await expect
      .poll(async () => (await eventTypes(page)).filter((type) => type === 'ready').length)
      .toBe(1);
    expect(await eventTypes(page)).toContain('event:ready');
  });

  test('reports every new size to onResized', async ({ page }) => {
    const frame = await openParent(page);
    await styleInChild(page, '#box', { height: '500px' });
    await expect(frame).toHaveCSS('height', '500px');

    await expect
      .poll(async () =>
        (await events(page)).filter((event) => event.type === 'resized').map((e) => e.height)
      )
      .toContain(500);
  });

  test('delivers a child message to onMessage and the frame-message event', async ({ page }) => {
    await openParent(page);

    await page
      .frameLocator('#frame')
      .locator('body')
      .evaluate(() => window.parentIframe.sendMessage('from-child'));

    await expect
      .poll(async () =>
        (await events(page))
          .filter((event) => event.type === 'message' || event.type === 'event:frame-message')
          .map((event) => event.message)
      )
      .toEqual(['from-child', 'from-child']);
  });

  test('sends a message to the child', async ({ page }) => {
    const frame = await openParent(page);
    // Wait for the frame to be live: a message posted at a frame that is still
    // on about:blank is dropped, with nothing to retry it.
    await expect(frame).toHaveCSS('height', '300px');

    await page.evaluate(() => window.__handle.sendMessage({ echo: 'ping' }));

    await expect
      .poll(async () =>
        (await events(page)).filter((e) => e.type === 'message').map((e) => e.message)
      )
      .toContain('echo:ping');
  });

  test('autoResize(false) pauses sizing and autoResize(true) resumes it', async ({ page }) => {
    const frame = await openParent(page);
    await expect(frame).toHaveCSS('height', '300px');
    const child = page.frameLocator('#frame').locator('body');

    expect(await child.evaluate(() => window.parentIframe.autoResize(false))).toBe(false);
    await styleInChild(page, '#box', { height: '450px' });

    // Prove the change landed in the child before asserting the parent ignored it.
    await expect(page.frameLocator('#frame').locator('#box')).toHaveCSS('height', '450px');
    await expect(frame).toHaveCSS('height', '300px');

    expect(await child.evaluate(() => window.parentIframe.autoResize(true))).toBe(true);
    await expect(frame).toHaveCSS('height', '450px');
  });

  test('disconnect stops sizing', async ({ page }) => {
    const frame = await openParent(page);
    await expect(frame).toHaveCSS('height', '300px');

    await page.evaluate(() => window.__handle.disconnect());
    await styleInChild(page, '#box', { height: '700px' });

    await expect(page.frameLocator('#frame').locator('#box')).toHaveCSS('height', '700px');
    await expect(frame).toHaveCSS('height', '300px');
  });

  test('warns when the child page is missing the script', async ({ page }) => {
    const warning = page.waitForEvent('console', (message) => message.type() === 'warning');

    await openParent(page, { child: 'child-bare.html', warn: 500 });

    expect((await warning).text()).toContain('resize-iframe-child.js');
  });

});
