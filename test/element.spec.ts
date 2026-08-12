import { expect, test } from '@playwright/test';
import { childOrigin, events, inlineHeight, openElement, styleInChild } from './helpers';

test.describe('<resize-iframe> element', () => {
  test('sizes the frame to its content', async ({ page }) => {
    const frame = await openElement(page);

    await expect(frame).toHaveCSS('height', '300px');
  });

  test('gives the iframe an accessible name by default', async ({ page }) => {
    const frame = await openElement(page);

    await expect(frame).toHaveAttribute('title', 'Embedded content');
  });

  test('uses the title it is given', async ({ page }) => {
    const frame = await openElement(page, { title: 'Pricing table' });

    await expect(frame).toHaveAttribute('title', 'Pricing table');
  });

  test('passes allow and sandbox through, which third-party embeds need', async ({ page }) => {
    const frame = await openElement(page, {
      allow: 'storage-access',
      sandbox: 'allow-scripts allow-same-origin allow-storage-access-by-user-activation',
    });

    await expect(frame).toHaveAttribute('allow', 'storage-access');
    await expect(frame).toHaveAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-storage-access-by-user-activation'
    );
    await expect(frame).toHaveCSS('height', '300px');
  });

  test('caps the frame at max-h', async ({ page }) => {
    const frame = await openElement(page, { 'max-h': '100px' });

    // The library still sets the content height inline; max-height caps what the
    // page actually gets, so computed height is the capped value.
    await expect.poll(() => inlineHeight(frame)).toBe('300px');
    await expect.poll(async () => (await frame.boundingBox())?.height).toBe(100);
  });

  test('honours min-h', async ({ page }) => {
    const frame = await openElement(page, { 'min-h': '500px' });

    await expect
      .poll(async () => (await frame.boundingBox())?.height)
      .toBe(500);
  });

  test('re-sizes to the new page when src changes', async ({ page }) => {
    const frame = await openElement(page);
    await expect(frame).toHaveCSS('height', '300px');

    await page.evaluate(
      (src) => window.__frame.setAttribute('src', src),
      `${childOrigin}/test/pages/child-marked.html`
    );

    await expect(frame).toHaveCSS('height', '180px');
  });

  test('emits resize events that cross the shadow boundary', async ({ page }) => {
    const frame = await openElement(page);
    await expect(frame).toHaveCSS('height', '300px');

    await styleInChild(page, '#box', { height: '420px' });

    await expect
      .poll(async () =>
        (await events(page)).filter((event) => event.type === 'resize').map((e) => e.height)
      )
      .toContain(420);
  });

  test('releases its message listener when removed from the page', async ({ page }) => {
    const frame = await openElement(page);
    await expect(frame).toHaveCSS('height', '300px');

    const stillBound = await page.evaluate(() => {
      const element = window.__frame as HTMLElement & { iframe: HTMLIFrameElement };
      element.remove();
      return 'iframeResizer' in element.iframe;
    });

    expect(stillBound).toBe(false);
  });
});
