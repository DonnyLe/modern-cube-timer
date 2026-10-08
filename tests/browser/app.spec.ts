import { test, expect } from '@playwright/test';
test('scrambles load and refresh without worker errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const scramble = page.locator('.scramble-text');
  const validScramble = /^[URFDLB]2?'?(?: [URFDLB]2?'?)+$/;
  await expect(scramble).toHaveText(validScramble, { timeout: 30000 });
  const first = await scramble.innerText();
  await page.getByRole('button', { name: 'New scramble', exact: true }).click();
  await expect(scramble).not.toHaveText(first, { timeout: 30000 });
  await expect(scramble).toHaveText(validScramble);
  await expect(page.locator('.cube-preview svg')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.preview-caption')).toHaveText('3×3×3 state preview');
  await expect(page.getByText('Scramble could not load.', { exact: false })).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('manual solve, penalty, statistics, theme and persistence', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  await page.getByRole('button', { name: 'Add manual solve' }).click();
  await page.getByLabel('Time in seconds').fill('12.84');
  await page.getByRole('button', { name: 'Save solve' }).click();
  await expect(page.locator('.recent-list')).toContainText('12.84');
  await page.locator('.recent-list .solve-row').first().click();
  await page.getByLabel('Penalty').selectOption('+2');
  await page.getByLabel('Notes').fill('Test solve');
  await page.getByRole('button', { name: 'Save solve' }).click();
  await expect(page.locator('.recent-list')).toContainText('14.84');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Night mode', { exact: true }).check();
  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await expect(page.locator('.app')).toHaveClass(/theme-dark/);
  await page.reload();
  await expect(page.locator('.recent-list')).toContainText('14.84');
  await expect(page.locator('.app')).toHaveClass(/theme-dark/);
});
test('keyboard timing and input guards', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.down('Space');
  await page.waitForTimeout(350);
  await page.keyboard.up('Space');
  await expect(page.locator('.app')).toHaveClass(/is-running/);
  await page.waitForTimeout(150);
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await expect(page.locator('.recent-list .solve-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Add manual solve' }).click();
  await page.getByLabel('Time in seconds').press('Space');
  await expect(page.locator('.app')).not.toHaveClass(/is-running/);
});
test('mobile workspace fits and settings apply', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Recent solves' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('15-second inspection').check();
  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await expect(page.locator('.timer-hint')).toHaveText('Press space to inspect');
});
