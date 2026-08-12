import { expect, test } from '@playwright/test';
import { events, openElement, openParent } from './helpers';

const childBody = (page: import('@playwright/test').Page) =>
  page.frameLocator('#frame, resize-iframe iframe').locator('body');

test.describe('storage access', () => {
  test('reports the frame storage access state to the parent', async ({ page }) => {
    await openParent(page);

    await expect
      .poll(async () => (await events(page)).find((event) => event.type === 'storage')?.hasAccess)
      .toEqual(expect.any(Boolean));
  });

  test('the element emits a storage-access event', async ({ page }) => {
    await openElement(page);

    await expect
      .poll(async () =>
        (await events(page)).find((event) => event.type === 'storage-access')?.hasAccess
      )
      .toEqual(expect.any(Boolean));
  });

  test('the child can probe access without a user gesture', async ({ page }) => {
    await openParent(page);

    const access = await childBody(page).evaluate(() => window.parentIframe.hasStorageAccess());

    expect(typeof access).toBe('boolean');
  });
});
