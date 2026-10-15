import { test, expect, type Page } from '@playwright/test';

async function chooseMode(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Color mode' }).click();
  await page.getByRole('option', { name, exact: true }).click();
}

test('system appearance updates live, persists, and allows manual overrides', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Color mode' })).toHaveText(
    'Use system settings',
  );
  await expect(page.locator('.app')).toHaveClass(/theme-dark/);
  await expect(page.getByText('Editing night colors.', { exact: true })).toBeVisible();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('.app')).toHaveClass(/theme-light/);
  await expect(page.getByText('Editing day colors.', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Color mode' })).toHaveText(
    'Use system settings',
  );
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('.app')).toHaveClass(/theme-dark/);
  await chooseMode(page, 'Day');
  await expect(page.locator('.app')).toHaveClass(/theme-light/);
  await page.emulateMedia({ colorScheme: 'light' });
  await chooseMode(page, 'Night');
  await expect(page.locator('.app')).toHaveClass(/theme-dark/);
  await page.getByRole('button', { name: 'Reset appearance', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Color mode' })).toHaveText(
    'Use system settings',
  );
  await expect(page.locator('.app')).toHaveClass(/theme-light/);
});

test('automatic appearance switches at local day and night boundaries', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  const localTime = (hour: number, minute = 0, second = 0) =>
    page.evaluate(([h, m, s]) => new Date(2026, 9, 14, h, m, s).getTime(), [hour, minute, second]);

  await page.clock.install({ time: await localTime(6) });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await chooseMode(page, 'Automatic day/night');
  await expect(page.locator('.app')).toHaveClass(/theme-dark/);
  await page.clock.setSystemTime(await localTime(7));
  await page.clock.fastForward(1000);
  await expect(page.locator('.app')).toHaveClass(/theme-light/);
  await page.clock.setSystemTime(await localTime(19));
  await page.clock.fastForward(1000);
  await expect(page.locator('.app')).toHaveClass(/theme-dark/);
  await page.reload();
  await expect(page.locator('.app')).toHaveClass(/theme-dark/);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Color mode' })).toHaveText(
    'Automatic day/night',
  );
});
