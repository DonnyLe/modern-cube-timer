import { test, expect, type Page } from '@playwright/test';
import { puzzleEvents, puzzles } from '../../src/core/puzzles';

async function selectPuzzle(page: Page, event: keyof typeof puzzles) {
  await page.getByRole('button', { name: 'Edit puzzle and session', exact: true }).click();
  const picker = page.getByRole('combobox', { name: 'Puzzle', exact: true });

  await expect(picker).toBeEnabled();
  await picker.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible();
  // Use the dropdown's keyboard navigation rather than racing Firefox's
  // pointer handling while the popup positions and scrolls its current item.
  await page.keyboard.press('Home');
  await expect(
    page.getByRole('option', { name: puzzles[puzzleEvents[0]].label, exact: true }),
  ).toBeFocused();

  for (let index = 0; index < puzzleEvents.indexOf(event); index++) {
    await page.keyboard.press('ArrowDown');
    await expect(
      page.getByRole('option', { name: puzzles[puzzleEvents[index + 1]].label, exact: true }),
    ).toBeFocused();
  }

  await expect(page.getByRole('option', { name: puzzles[event].label, exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(picker).toHaveText(puzzles[event].label);
  await expect(picker).toBeEnabled();
  await expect(page.locator('.puzzle-artwork')).toHaveAttribute('data-puzzle', event);
  await expect(page.locator('.puzzle-artwork')).toHaveAttribute('data-mode', /3d|face/, {
    timeout: 30000,
  });
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
}

test('all supported puzzles generate a scramble and a matching SVG preview', async ({ page }) => {
  test.setTimeout(300000);
  await page.goto('/');

  for (const event of puzzleEvents) {
    await selectPuzzle(page, event);
    // The preview shows the solved state until the scramble arrives, so wait for the scramble first.
    await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
      timeout: 60000,
    });
    await expect(page.locator('.cube-preview')).toHaveAttribute('data-puzzle', event);
    await expect(page.locator('.cube-preview')).toHaveAttribute('data-status', 'ready', {
      timeout: 60000,
    });
    await expect(page.locator('.cube-preview svg')).toHaveCount(1);
    await expect(page.locator('.preview-caption')).toHaveText(
      `${puzzles[event].label} state preview`,
    );
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
  await expect(page.getByRole('button', { name: 'Edit puzzle and session' })).toBeDisabled();
  await expect(page.locator('.session-label')).toHaveCount(0);
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await expect(page.locator('.recent-list .solve-row')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.recent footer')).toContainText('2x2');
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
test('Megaminx uses the available width without an inner scrollbar and navigation stacks above controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1130, height: 900 });
  await page.goto('/');
  await selectPuzzle(page, 'minx');
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
    timeout: 60000,
  });
  const text = page.locator('.scramble-text');
  const textBox = (await text.boundingBox())!;
  const barBox = (await page.locator('.scramble-bar').boundingBox())!;

  expect(textBox.width).toBeCloseTo(barBox.width, 0);
  expect(await text.evaluate((element) => getComputedStyle(element).whiteSpace)).toBe('normal');
  expect(await text.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(
    true,
  );

  for (const width of [850, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const navBox = (await page.locator('.segmented').boundingBox())!;
    const actionsBox = (await page.locator('.header-actions').boundingBox())!;

    expect(navBox.y + navBox.height).toBeLessThanOrEqual(actionsBox.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(await text.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(
      true,
    );
  }
});

test('scramble controls stay below floating text at desktop and mobile sizes', async ({ page }) => {
  await page.goto('/');
  const actions = page.locator('.scramble-actions');
  const text = page.locator('.scramble-text');
  const navBox = (await page.locator('.segmented').boundingBox())!;
  const topbarBox = (await page.locator('.topbar').boundingBox())!;

  expect(navBox.x + navBox.width / 2).toBeCloseTo(topbarBox.x + topbarBox.width / 2, 0);
  await expect(
    page
      .locator('.timer-session-heading')
      .getByRole('button', { name: 'Edit puzzle and session', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Puzzle', exact: true })).toHaveCount(0);

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
      const currentNav = (await page.locator('.segmented').boundingBox())!;
      const currentTopbar = (await page.locator('.topbar').boundingBox())!;

      expect(currentNav.x + currentNav.width / 2).toBeCloseTo(
        currentTopbar.x + currentTopbar.width / 2,
        0,
      );
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
  await page.getByRole('button', { name: 'Edit puzzle and session', exact: true }).click();
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
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await picker.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(picker).toBeFocused();
  await expect(page.getByRole('dialog', { name: 'Puzzle and sessions' })).toBeVisible();
  await expect(page.locator('.app')).not.toHaveClass(/is-running/);
  await expect(page.locator('.recent-list')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Timer. Hold to start, press to stop' }),
  ).toBeVisible();
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 600 },
]) {
  test(`puzzle dropdown's last option receives pointer input at ${viewport.width}×${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit puzzle and session' }).click();
    const picker = page.getByRole('combobox', { name: 'Puzzle', exact: true });

    await picker.click();
    await page.keyboard.press('End');
    const clock = page.getByRole('option', { name: 'Clock', exact: true });

    await expect(clock).toBeFocused();
    await expect
      .poll(() =>
        clock.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);

          return hit !== null && element.contains(hit);
        }),
      )
      .toBe(true);
    await page.screenshot({ path: testInfo.outputPath('puzzle-dropdown.png') });
    await clock.click();
    await expect(picker).toHaveText('Clock');
    await expect(picker).toBeEnabled();
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await expect(page.locator('.recent footer')).toContainText('Clock');
  });
}
