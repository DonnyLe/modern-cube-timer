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

test('scramble actions move below the selector only for long scrambles', async ({ page }) => {
  await page.goto('/');
  const bar = page.locator('.scramble-bar');
  const selector = page.getByRole('combobox', { name: 'Puzzle', exact: true });
  const actions = page.locator('.scramble-actions');
  const ready = () =>
    expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
      timeout: 60000,
    });
  await ready();
  await expect(bar).not.toHaveClass(/scramble-bar-expanded/);
  expect((await actions.boundingBox())!.x).toBeGreaterThan((await selector.boundingBox())!.x);

  await selectPuzzle(page, '666');
  await ready();
  await expect(bar).toHaveClass(/scramble-bar-expanded/);
  const selectorBox = (await selector.boundingBox())!;
  expect((await actions.boundingBox())!.y).toBeGreaterThanOrEqual(
    selectorBox.y + selectorBox.height,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(bar).toHaveClass(/scramble-bar-expanded/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

  await selectPuzzle(page, '222');
  await ready();
  await expect(bar).not.toHaveClass(/scramble-bar-expanded/);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(bar).not.toHaveClass(/scramble-bar-expanded/);
});

test('long scrambles use the expanded layout on their first frame', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { scrambleLayoutFrames: boolean[] };
    state.scrambleLayoutFrames = [];
    const sample = () => {
      const bar = document.querySelector('.scramble-bar');
      const text = bar?.querySelector('.scramble-text')?.textContent || '';
      if (text.length > 200) {
        state.scrambleLayoutFrames.push(bar!.classList.contains('scramble-bar-expanded'));
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.goto('/');
  await selectPuzzle(page, '666');
  const assertFrames = async () => {
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as typeof window & { scrambleLayoutFrames: boolean[] }).scrambleLayoutFrames
              .length,
        ),
      )
      .toBeGreaterThan(0);
    expect(
      await page.evaluate(() =>
        (window as typeof window & { scrambleLayoutFrames: boolean[] }).scrambleLayoutFrames.every(
          Boolean,
        ),
      ),
    ).toBe(true);
  };
  await assertFrames();
  await page.reload();
  await assertFrames();
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
