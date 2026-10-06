import { test, expect } from '@playwright/test';
import { puzzleEvents, puzzles } from '../../src/core/puzzles';

test('all supported puzzles generate a scramble and a matching SVG preview', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto('/');
  for (const event of puzzleEvents) {
    await page.getByLabel('Puzzle', { exact: true }).selectOption(event);
    await expect(page.locator('.cube-preview')).toHaveAttribute('data-puzzle', event);
    await expect(page.locator('.cube-preview')).toHaveAttribute('data-status', 'ready', {
      timeout: 60000,
    });
    await expect(page.locator('.cube-preview svg')).toHaveCount(1);
    await expect(page.locator('.preview-caption')).toHaveText(
      `${puzzles[event].label} state preview`,
    );
    await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled();
  }
});
test('puzzle switching separates solves, persists selection, and is locked during timing', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  await page.getByRole('button', { name: 'Add manual solve' }).click();
  await page.getByLabel('Time in seconds').fill('12.84');
  await page.getByRole('button', { name: 'Save solve' }).click();
  await page.getByLabel('Puzzle', { exact: true }).selectOption('222');
  await expect(page.locator('.recent-list')).toHaveCount(0);
  await expect(page.locator('.cube-preview')).toHaveAttribute('data-status', 'ready', {
    timeout: 30000,
  });
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.down('Space');
  await page.waitForTimeout(350);
  await page.keyboard.up('Space');
  await expect(page.getByLabel('Puzzle', { exact: true })).toBeDisabled();
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await expect(page.locator('.recent-list .solve-row')).toHaveCount(1);
  await page.reload();
  await expect(page.getByLabel('Puzzle', { exact: true })).toHaveValue('222');
  await expect(page.locator('.recent-list .solve-row')).toHaveCount(1);
  await page.getByLabel('Puzzle', { exact: true }).selectOption('333');
  await expect(page.locator('.recent-list')).toContainText('12.84');
});
test('rapid switches cannot leave an old puzzle scramble or preview', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Puzzle', { exact: true }).selectOption('444');
  await page.getByLabel('Puzzle', { exact: true }).selectOption('minx');
  await page.getByLabel('Puzzle', { exact: true }).selectOption('pyram');
  await expect(page.locator('.cube-preview')).toHaveAttribute('data-puzzle', 'pyram');
  await expect(page.locator('.cube-preview')).toHaveAttribute('data-status', 'ready', {
    timeout: 60000,
  });
  await expect(page.locator('.preview-caption')).toHaveText('Pyraminx state preview');
});
test('long scrambles fit the mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('Puzzle', { exact: true }).selectOption('minx');
  await expect(page.locator('.cube-preview')).toHaveAttribute('data-status', 'ready', {
    timeout: 30000,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
