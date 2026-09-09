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

  test('sandboxes the frame before its src loads', async ({ page }) => {
    // A same-origin child, so the sandbox attribute is the only thing that can
    // make the frame opaque. No allow-same-origin means it should be: if sandbox
    // landed after src, the first load would have escaped it and stayed readable.
    const frame = await openElement(page, { childOrigin: '', sandbox: 'allow-scripts' });

    await expect(frame).toHaveCSS('height', '300px');
    expect(
      await frame.evaluate((element: HTMLIFrameElement) => element.contentDocument === null)
    ).toBe(true);
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

  test('sizes a sandboxed srcdoc frame when the child is injected', async ({ page }) => {
    // story.html / report embeds: inline HTML, opaque origin, no allow-same-origin.
    // withResizeChild (used by element.html in mode=srcdoc) puts the child inside.
    const frame = await openElement(page, {
      mode: 'srcdoc',
      sandbox: 'allow-scripts',
      srcdoc:
        '<style>body{margin:0}</style><div id="box" style="height:240px;background:#ddd">inline</div>',
    });

    await expect(frame).toHaveCSS('height', '240px');
    expect(
      await frame.evaluate((element: HTMLIFrameElement) => element.contentDocument === null)
    ).toBe(true);
  });

  test('sizes a srcdoc fragment that is nothing but text', async ({ page }) => {
    const frame = await openElement(page, {
      mode: 'srcdoc',
      sandbox: 'allow-scripts',
      srcdoc: 'just text, no elements at all',
    });

    // A line of text, not the 150px the browser gives an unsized frame.
    await expect
      .poll(async () => Number.parseFloat(await inlineHeight(frame)) || 0)
      .toBeGreaterThan(0);
    expect(Number.parseFloat(await inlineHeight(frame))).toBeLessThan(60);
  });
});
