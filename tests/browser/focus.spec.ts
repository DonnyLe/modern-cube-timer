import { test, expect } from '@playwright/test';

test('focus mode hides header controls, puzzle selector and widgets, and exits on logo hover or Escape', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  const nav = page.locator('.segmented');
  const widgets = page.locator('.focus-widgets');
  await page.getByRole('button', { name: 'Enter focus mode' }).click();
  await expect(nav).toBeHidden();
  await expect(page.locator('.header-actions')).toBeHidden();
  await expect(page.locator('.puzzle-selector')).toBeHidden();
  await expect(page.getByRole('combobox', { name: 'Puzzle', exact: true })).toHaveCount(0);
  await expect(widgets).toBeHidden();
  await expect(page.getByRole('button', { name: 'Copy scramble' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Exit focus mode' }).hover();
  await expect(nav).toBeVisible();
  await expect(widgets).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Puzzle', exact: true })).toBeVisible();
  await page.mouse.move(5, 5);
  await page.getByRole('button', { name: 'Enter focus mode' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('link', { name: 'Exit focus mode' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(nav).toBeVisible();
  await expect(widgets).toBeVisible();
  await expect(page.getByRole('button', { name: 'Timer', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.locator('.workspace-default')).toHaveCSS('opacity', '1');
});

test('the widget focus preference persists and leaves widgets visible when disabled', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const setting = page.getByLabel('Hide widgets in focus mode');
  await expect(setting).toBeChecked();
  await setting.uncheck();
  // The checkbox updates immediately; reload only after the IndexedDB write commits.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<boolean | undefined>((resolve, reject) => {
            const request = indexedDB.open('turn-timer');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const database = request.result;
              const transaction = database.transaction('settings', 'readonly');
              const setting = transaction.objectStore('settings').get('preferences');
              transaction.oncomplete = () => {
                database.close();
                resolve(setting.result?.value.hideWidgetsInFocus);
              };
              transaction.onabort = () => {
                database.close();
                reject(transaction.error);
              };
            };
          }),
      ),
    )
    .toBe(false);
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(setting).not.toBeChecked();
  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await page.getByRole('button', { name: 'Enter focus mode' }).click();
  await expect(page.locator('.header-actions')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Recent solves' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add manual solve' })).toBeEnabled();
});

test('focus mode works on mobile with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter focus mode' }).click();
  await expect(page.locator('.segmented')).toBeHidden();
  await expect(page.locator('.focus-widgets')).toBeHidden();
  expect(
    await page
      .locator('.header-actions')
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0s');
  await page.getByRole('link', { name: 'Exit focus mode' }).click();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
});
