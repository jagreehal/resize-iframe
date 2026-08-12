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

  // Regression: measuring body ratchets, because body stretches to the frame in
  // quirks mode and under height:100%, so the frame could only ever grow.
  test('shrinks even when the child page stretches its body to the frame', async ({ page }) => {
    const frame = await openParent(page, { child: 'child-quirks.html' });
    await expect(frame).toHaveCSS('height', '300px');

    await styleInChild(page, '#box', { height: '150px' });

    await expect(frame).toHaveCSS('height', '150px');
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
