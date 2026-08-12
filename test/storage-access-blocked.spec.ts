import { expect, test } from '@playwright/test';
import { events, openParent } from './helpers';

// The state the package is really for: a cross-site frame whose cookies are
// partitioned. Whether a browser partitions a given frame is its own policy —
// Chromium's phaseout flag exempts loopback addresses, so it cannot be provoked
// here — and it is not what this library is responsible for. What is ours is the
// handling, so the API is stubbed to the denied state and the flow asserted
// against it. Runs on every browser, and stays honest when the policies change.
test.describe('storage access denied', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Applies to every frame in the page, including the cross-site child.
      document.hasStorageAccess = async () => false;
      document.requestStorageAccess = async () => {
        throw new Error('denied: no user gesture');
      };
    });
  });

  test('reports the denial to the parent', async ({ page }) => {
    await openParent(page);

    await expect
      .poll(async () => (await events(page)).find((event) => event.type === 'storage')?.hasAccess)
      .toBe(false);
  });

  test('a refused request resolves false instead of throwing into the page', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await openParent(page);

    const granted = await page
      .frameLocator('#frame')
      .locator('body')
      .evaluate(() => window.parentIframe.requestStorageAccess());

    expect(granted).toBe(false);
    expect(pageErrors).toEqual([]);
  });

  test('keeps resizing regardless of storage access', async ({ page }) => {
    const frame = await openParent(page);

    await expect(frame).toHaveCSS('height', '300px');
  });
});
