import { test, expect } from '@playwright/test';

test('dialogs animate closed and rapid toggling never leaves a blocking layer', async ({
  page,
}) => {
  await page.goto('/');
  const edit = page.getByRole('button', { name: 'Edit puzzle and session', exact: true });
  const modal = page.getByRole('dialog', { name: 'Puzzle and sessions', exact: true });

  await edit.click();
  await expect(modal).toHaveAttribute('data-open', '');
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(edit).toBeFocused();

  for (let i = 0; i < 5; i++) {
    await edit.click();
    await page.keyboard.press('Escape');
  }

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.dialog-backdrop')).toHaveCount(0);
  await edit.click();
  await expect(modal).toBeVisible();
  // A dialog reopened mid-exit keeps its select menu usable.
  await page.getByRole('combobox', { name: 'Puzzle', exact: true }).click();
  await expect(page.getByRole('option', { name: '2×2×2', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
  await page.locator('.dialog-backdrop').click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('dialogs skip movement when reduced motion is preferred', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit puzzle and session', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Puzzle and sessions', exact: true });

  await expect(modal).toBeVisible();
  // Checked once rather than retried, so a running entrance animation would fail it.
  expect(await modal.evaluate((element) => getComputedStyle(element).transform)).toBe('none');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
