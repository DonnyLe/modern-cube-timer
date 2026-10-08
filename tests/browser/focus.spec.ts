import { test, expect } from '@playwright/test';

test('the auto-fit timer grows in focus mode and keeps long times inside a narrow viewport', async ({
  page,
}) => {
  await page.goto('/');
  const timer = page.locator('[data-timer]');
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  const normalSize = await timer.evaluate((element) =>
    parseFloat(getComputedStyle(element).fontSize),
  );
  await page.getByRole('button', { name: 'Enter focus mode' }).click();
  await expect
    .poll(() => timer.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)))
    .toBeGreaterThan(normalSize * 1.4);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await timer.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
  ).toBeGreaterThan(100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('link', { name: 'Exit focus mode' }).click();
  await page.getByRole('button', { name: 'Add manual solve' }).click();
  await page.getByLabel('Time in seconds').fill('83.45');
  await page.getByRole('button', { name: 'Save solve' }).click();
  await expect(timer).toHaveText('1:23.45');
  await page.getByRole('button', { name: 'Enter focus mode' }).click();
  await expect(timer).toHaveText('1:23.45');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  const timerBox = (await timer.boundingBox())!;
  expect(timerBox.x).toBeGreaterThanOrEqual(0);
  expect(timerBox.x + timerBox.width).toBeLessThanOrEqual(390);
});

test('focus mode hides header controls, puzzle selector and widgets, and exits on logo hover or Escape', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  const nav = page.locator('.segmented');
  const widgets = page.locator('.focus-widgets');
  const text = page.locator('.scramble-text');
  const originalY = (await text.boundingBox())!.y;
  await page.getByRole('button', { name: 'Enter focus mode' }).click();
  await expect(nav).toBeHidden();
  await expect(page.locator('.header-actions')).toBeHidden();
  await expect(page.locator('.puzzle-selector')).toBeHidden();
  await expect(page.getByRole('combobox', { name: 'Puzzle', exact: true })).toHaveCount(0);
  await expect(widgets).toBeHidden();
  await expect.poll(async () => (await widgets.boundingBox())?.height ?? 0).toBeLessThan(1);
  await expect(page.getByRole('button', { name: 'Copy scramble' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeVisible();
  await expect.poll(async () => (await text.boundingBox())!.y).toBeLessThan(originalY);
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
});

test('the widget focus preference persists and leaves widgets visible when disabled', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const setting = page.getByLabel('Hide widgets in focus mode');
  await expect(setting).toBeChecked();
  await setting.uncheck();
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(setting).not.toBeChecked();
  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await page.getByRole('button', { name: 'Enter focus mode' }).click();
  await expect(page.locator('.header-actions')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Recent solves' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add manual solve' })).toBeEnabled();
});

test('focus mode fits on mobile and respects reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const originalHeaderHeight = (await page.locator('.topbar').boundingBox())!.height;
  const originalScrambleY = (await page.locator('.scramble-text').boundingBox())!.y;
  await page.getByRole('button', { name: 'Enter focus mode' }).click();
  await expect(page.locator('.segmented')).toBeHidden();
  await expect(page.locator('.focus-widgets')).toBeHidden();
  expect((await page.locator('.topbar').boundingBox())!.height).toBeLessThan(
    originalHeaderHeight - 50,
  );
  expect((await page.locator('.scramble-text').boundingBox())!.y).toBeLessThan(
    originalScrambleY - 50,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  expect(
    await page
      .locator('.header-actions')
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0s');
  await page.getByRole('link', { name: 'Exit focus mode' }).click();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
});
