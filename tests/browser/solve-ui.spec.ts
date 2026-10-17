import { test, expect, type Page } from '@playwright/test';

test.use({ hasTouch: true });

async function openTimer(page: Page, inspection = false) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Hide UI while solving')).toBeChecked();
  if (inspection) await page.getByLabel('15-second inspection').check();
  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled();
  await expect(page.locator('.app > .page-fade-stack > .page-fade:not([aria-hidden])')).toHaveCSS(
    'opacity',
    '1',
  );
  await page.locator('[data-timer]').focus();
  await expect(page.locator('[data-timer]')).toBeFocused();
}

async function expectSurroundingsHidden(page: Page) {
  for (const selector of [
    '.brand',
    '.segmented',
    '.scramble-bar',
    '.timer-session-heading',
    '.timer-hint',
    '.inline-stats',
    '.focus-widgets',
  ]) {
    await expect(page.locator(selector)).toBeHidden();
  }

  await expect(page.locator('.scramble-bar')).toHaveCSS('opacity', '0');
  await expect(page.locator('[data-timer]')).toBeVisible();
  await expect(page.locator('[data-timer]')).toHaveCSS('filter', 'none');
}

test('holding hides everything except the timer; cancellation and stopping restore it', async ({
  page,
}) => {
  await openTimer(page);
  await page.keyboard.down('Space');
  await expect(page.locator('.app')).toHaveClass(/is-hiding-ui/);
  await page.keyboard.up('Space');
  await expect(page.locator('.app')).not.toHaveClass(/is-hiding-ui/);
  await expect(page.locator('.scramble-bar')).toHaveCSS('opacity', '1');

  await page.keyboard.down('Space');
  await expect(page.locator('[data-timer]')).toHaveClass(/ready/);
  await expectSurroundingsHidden(page);
  await page.keyboard.up('Space');
  await expect(page.locator('.app')).toHaveClass(/is-running/);
  await expectSurroundingsHidden(page);
  await page.keyboard.press('Space');
  await expect(page.locator('.app')).not.toHaveClass(/is-hiding-ui/);
  await expect(page.locator('.brand')).toBeVisible();
  await expect(page.locator('.scramble-bar')).toHaveCSS('opacity', '1');
  await expect(page.locator('.recent-list .solve-row')).toHaveCount(1);

  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Hide UI while solving')).toBeChecked();
});

test('inspection stays visible and Escape restores an interrupted hold', async ({ page }) => {
  await openTimer(page, true);
  await page.keyboard.press('Space');
  await expect(page.locator('.timer-hint')).toHaveText('Inspect · hold space when ready');
  await expect(page.locator('.scramble-bar')).toBeVisible();
  await page.keyboard.down('Space');
  await expect(page.locator('[data-timer]')).toHaveClass(/ready/);
  await expectSurroundingsHidden(page);
  await page.keyboard.press('Escape');
  await page.keyboard.up('Space');
  await expect(page.locator('.scramble-bar')).toHaveCSS('opacity', '1');
  await expect(page.locator('.app')).not.toHaveClass(/is-running|is-hiding-ui/);
});

test('zero hold touch input works in focus mode with reduced motion and a hidden clock', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await openTimer(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Hide clock while solving').check();
  await page.getByRole('slider', { name: 'Hold to start', exact: true }).press('Home');
  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await page.getByRole('button', { name: 'Enter focus mode' }).click();
  const timer = page.locator('[data-timer]');

  await timer.tap();
  await expect(timer).toHaveText('Solving...');
  await expectSurroundingsHidden(page);
  await timer.tap();
  await expect(page.locator('.app')).not.toHaveClass(/is-hiding-ui/);
  await expect(page.locator('.app')).toHaveClass(/is-focused/);
  await expect(page.locator('.brand')).toBeVisible();
  await expect(page.locator('.scramble-bar')).toBeVisible();
  await expect(page.locator('.focus-widgets')).toBeHidden();
});
