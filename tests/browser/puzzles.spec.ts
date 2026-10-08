import { test, expect, type Page } from '@playwright/test';
import { puzzleEvents, puzzles } from '../../src/core/puzzles';

async function selectPuzzle(page: Page, event: keyof typeof puzzles) {
  await page.getByRole('combobox', { name: 'Puzzle', exact: true }).click();
  await page.getByRole('option', { name: puzzles[event].label, exact: true }).click();
}

test('all supported puzzles generate a scramble and a matching SVG preview', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto('/');
  for (const event of puzzleEvents) {
    await selectPuzzle(page, event);
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
  await selectPuzzle(page, '222');
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
  await expect(page.getByLabel('Puzzle', { exact: true })).toHaveText('2×2×2');
  await expect(page.locator('.recent-list .solve-row')).toHaveCount(1);
  await selectPuzzle(page, '333');
  await expect(page.locator('.recent-list')).toContainText('12.84');
});
test('rapid switches cannot leave an old puzzle scramble or preview', async ({ page }) => {
  await page.goto('/');
  await selectPuzzle(page, '444');
  await selectPuzzle(page, 'minx');
  await selectPuzzle(page, 'pyram');
  await expect(page.locator('.cube-preview')).toHaveAttribute('data-puzzle', 'pyram');
  await expect(page.locator('.cube-preview')).toHaveAttribute('data-status', 'ready', {
    timeout: 60000,
  });
  await expect(page.locator('.preview-caption')).toHaveText('Pyraminx state preview');
});
test('long scrambles fit the mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await selectPuzzle(page, 'minx');
  await expect(page.locator('.cube-preview')).toHaveAttribute('data-status', 'ready', {
    timeout: 30000,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('scramble controls stay below floating text at desktop and mobile sizes', async ({ page }) => {
  await page.goto('/');
  const actions = page.locator('.scramble-actions');
  const text = page.locator('.scramble-text');
  for (const event of ['333', '666', '222'] as const) {
    await selectPuzzle(page, event);
    await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
      timeout: 60000,
    });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const textBox = (await text.boundingBox())!;
      expect((await actions.boundingBox())!.y).toBeGreaterThanOrEqual(textBox.y + textBox.height);
      const actionsBox = (await actions.boundingBox())!;
      const barBox = (await page.locator('.scramble-bar').boundingBox())!;
      expect(actionsBox.x + actionsBox.width / 2).toBeCloseTo(barBox.x + barBox.width / 2, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
  }
  const style = await page.locator('.scramble-bar').evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, border: style.borderTopWidth };
  });
  expect(style).toEqual({ background: 'rgba(0, 0, 0, 0)', border: '0px' });
});

test('puzzle dropdown supports keyboard selection, Escape, and guards timer shortcuts', async ({
  page,
}) => {
  await page.goto('/');
  const picker = page.getByRole('combobox', { name: 'Puzzle', exact: true });
  await expect(picker).toBeEnabled();
  await picker.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('m');
  await expect(page.getByRole('option', { name: 'Megaminx', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(picker).toHaveText('Megaminx');
  await expect(picker).toBeFocused();
  await picker.click();
  await page.keyboard.down('Space');
  await page.waitForTimeout(350);
  await page.keyboard.up('Space');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(picker).toBeFocused();
  await expect(page.locator('.recent-list')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Timer. Hold to start, press to stop' }),
  ).toBeVisible();
});
