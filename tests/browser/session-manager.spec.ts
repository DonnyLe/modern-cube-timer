import { test, expect } from '@playwright/test';

test('previewing sessions preserves the timer until Continue and history follows selection', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add manual solve', exact: true }).click();
  await page.getByLabel('Time in seconds').fill('12.84');
  await page.getByRole('button', { name: 'Save solve', exact: true }).click();
  const edit = page.getByRole('button', { name: 'Edit puzzle and session', exact: true });

  await edit.click();
  const picker = page.getByRole('combobox', { name: 'Puzzle', exact: true });

  await picker.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(page.getByRole('option', { name: '2×2×2', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(picker).toHaveText('2×2×2');
  await expect(page.locator('.manager-session-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('.recent-list')).toContainText('12.84');
  await edit.click();
  await expect(picker).toHaveText('3×3×3');
  await page.getByRole('button', { name: 'Start new session', exact: true }).click();
  await edit.click();
  await expect(page.locator('.manager-session-row')).toHaveCount(2);
  await page.locator('.manager-session-row').last().click();
  await expect(page.getByRole('region', { name: 'Selected session' })).toContainText('12.84');
  await expect(page.locator('.manager-session-row').first()).toContainText('Current');
  await expect(page.locator('.manager-session-row').last()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.puzzle-artwork')).toHaveAttribute('data-mode', /3d|face/, {
    timeout: 30000,
  });
  await page.screenshot({ path: testInfo.outputPath('session-manager-desktop.png') });
  await page.getByRole('button', { name: 'View all', exact: true }).click();
  await expect(page.locator('.history-list')).toContainText('12.84');
  await page.locator('.history-list button').click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Recent solves', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('.recent-list')).toHaveCount(0);
  await edit.click();
  await page.locator('.manager-session-row').last().click();
  await page.getByRole('button', { name: 'Continue session', exact: true }).click();
  await expect(page.locator('.recent-list')).toContainText('12.84');
});

test('single-face fallback remains usable without WebGL and with reduced motion', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).startsWith('webgl')) return null;

      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Night mode', { exact: true }).check();
  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await page.getByRole('button', { name: 'Edit puzzle and session' }).click();
  await expect(page.locator('.puzzle-artwork')).toHaveAttribute('data-mode', 'face');
  await expect(page.locator('.puzzle-face-preview')).toHaveAttribute('data-status', 'ready', {
    timeout: 30000,
  });
  await expect(page.getByRole('button', { name: 'Pause puzzle rotation' })).toHaveCount(0);
  await page.getByLabel('Search sessions').fill('does not exist');
  await expect(page.locator('.manager-session-row')).toHaveCount(0);
  await page.getByLabel('Search sessions').fill('3x3');
  await expect(page.locator('.manager-session-row')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('session-manager-dark.png') });
  await page.getByRole('button', { name: 'Continue session', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
