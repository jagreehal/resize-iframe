import { expect, test } from '@playwright/test';
import { events, inlineHeight, inlineWidth, openParent, styleInChild } from './helpers';

test.describe('sizing', () => {
  test('sizes the frame to its content on load', async ({ page }) => {
    const frame = await openParent(page);

    await expect(frame).toHaveCSS('height', '300px');
  });

  test('grows when the content grows', async ({ page }) => {
    const frame = await openParent(page);
    await expect(frame).toHaveCSS('height', '300px');

    await styleInChild(page, '#box', { height: '600px' });

    await expect(frame).toHaveCSS('height', '600px');
  });

  test('shrinks when the content shrinks', async ({ page }) => {
    const frame = await openParent(page);
    await expect(frame).toHaveCSS('height', '300px');

    await styleInChild(page, '#box', { height: '200px' });

    await expect(frame).toHaveCSS('height', '200px');
  });

  // Content-based measure: measuring body itself ratchets, because body stretches
  // to the frame in quirks mode and under height:100%, so the frame could only
  // ever grow. MutationObserver is what sees the style change — body size does
  // not move, so ResizeObserver alone never fires.
  test('shrinks even when the child page stretches its body to the frame', async ({ page }) => {
    const frame = await openParent(page, { child: 'child-quirks.html' });
    await expect(frame).toHaveCSS('height', '300px');

    await styleInChild(page, '#box', { height: '150px' });

    await expect(frame).toHaveCSS('height', '150px');
  });

  // MutationObserver teeth: content appears under a stretched body. Body stays
  // the frame's height, so ResizeObserver sees nothing; without the mutation
  // observer a quiz reveal or chart finish would never resize the frame.
  test('grows when content appears in a stretched body', async ({ page }) => {
    const frame = await openParent(page, { child: 'child-quirks.html' });
    await expect(frame).toHaveCSS('height', '300px');

    await page.frameLocator('#frame').locator('body').evaluate((body) => {
      const extra = document.createElement('div');
      extra.style.height = '200px';
      body.append(extra);
    });

    await expect(frame).toHaveCSS('height', '500px');
  });

  // Skip-unchanged + content measure: a no-op mutation still schedules a
  // measure, but must not post. Without the skip, a stretched body + ResizeObserver
  // feedback loop re-posts every frame after the parent applies a height.
  test('does not re-post when the measured size is unchanged', async ({ page }) => {
    const frame = await openParent(page, { child: 'child-quirks.html' });
    await expect(frame).toHaveCSS('height', '300px');

    const resizedBefore = (await events(page)).filter((event) => event.type === 'resized').length;

    await page.frameLocator('#frame').locator('#box').evaluate((element) => {
      element.setAttribute('data-noop', '1');
    });
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    );

    expect((await events(page)).filter((event) => event.type === 'resized').length).toBe(
      resizedBefore
    );
    await expect(frame).toHaveCSS('height', '300px');
  });

  test('measures only the elements marked data-iframe-size', async ({ page }) => {
    const frame = await openParent(page, { child: 'child-marked.html' });

    // The unmarked 900px sibling below it is excluded, so 180px not 1080px.
    await expect(frame).toHaveCSS('height', '180px');
  });

  // The MutationObserver sees nothing here: no DOM or style change, just text
  // rewrapping at a narrower width. Only the ResizeObserver catches this.
  test('follows a reflow that changes no DOM at all', async ({ page }) => {
    const frame = await openParent(page, { child: 'child-reflow.html' });
    await expect(frame).not.toHaveCSS('height', '0px');
    const before = await inlineHeight(frame);

    await page.setViewportSize({ width: 400, height: 720 });

    await expect
      .poll(() => inlineHeight(frame), { message: 'frame follows the rewrapped text' })
      .not.toBe(before);
  });

  test('applies offsetSize to the reported height', async ({ page }) => {
    const frame = await openParent(page, { offset: 20 });

    await expect(frame).toHaveCSS('height', '320px');
  });

  test('direction=horizontal sizes width and leaves height alone', async ({ page }) => {
    const frame = await openParent(page, { direction: 'horizontal' });

    await expect(frame).toHaveCSS('width', '250px');
    expect(await inlineHeight(frame)).toBe('');
  });

  test('direction=both sizes both dimensions', async ({ page }) => {
    const frame = await openParent(page, { direction: 'both' });

    await expect(frame).toHaveCSS('height', '300px');
    await expect(frame).toHaveCSS('width', '250px');
  });

  test('direction=none reports sizes without touching the frame', async ({ page }) => {
    const frame = await openParent(page, { direction: 'none' });

    await expect
      .poll(async () => (await events(page)).some((event) => event.type === 'resized'))
      .toBe(true);
    expect(await inlineHeight(frame)).toBe('');
    expect(await inlineWidth(frame)).toBe('');
  });

  test('ignores size messages from a frame it is not bound to', async ({ page }) => {
    const frame = await openParent(page, { hostile: 1 });
    await expect(frame).toHaveCSS('height', '300px');

    // Wait until several spoofed messages have actually landed on the page,
    // so this asserts they were rejected rather than that they were early.
    await expect
      .poll(async () => (await events(page)).filter((e) => e.type === 'hostile-seen').length)
      .toBeGreaterThan(2);

    await expect(frame).toHaveCSS('height', '300px');
  });
});
