import { test, expect } from '@playwright/test';

test('expanded session survives reload, keeps the timer paused, and returns to its picker', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage sessions', exact: true }).click();
  await page.getByRole('button', { name: 'Expand session', exact: true }).click();
  await expect(page.getByRole('main', { name: 'Session details' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/#session\/.+\/overview$/);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.locator('.app')).not.toHaveClass(/is-running/);
  await page.getByRole('button', { name: 'All sessions', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Puzzle and sessions' })).toBeVisible();
  await page.getByRole('button', { name: 'Expand session', exact: true }).click();
  await page.getByRole('button', { name: 'Continue session', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add manual solve', exact: true })).toBeVisible();
});

test('missing session has a way back', async ({ page }) => {
  await page.goto('/#session/missing/overview');
  await expect(
    page.getByRole('heading', { name: 'This session is no longer available.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'All sessions', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Puzzle and sessions' })).toBeVisible();
});
