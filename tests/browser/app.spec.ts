import { test, expect, type Page } from '@playwright/test';
async function openTimer(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
    timeout: 30000,
  });
}

for (const focus of ['background', 'timer'] as const) {
  test(`held Space does not scroll with ${focus} focus`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 400 });
    await openTimer(page);
    if (focus === 'timer') await page.locator('[data-timer]').focus();
    else await page.locator('body').click({ position: { x: 5, y: 5 } });
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(400);
    const scrollY = await page.evaluate(() => window.scrollY);
    await page.keyboard.down('Space');
    await expect(page.locator('.timer-hint')).toHaveText('Release to start');
    for (let i = 0; i < 5; i++) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(50);
    }
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
    await page.keyboard.up('Space');
    await expect(page.locator('.app')).toHaveClass(/is-running/);
    await page.keyboard.down('Space');
    await expect(page.locator('.recent-list .solve-row')).toHaveCount(1);
    await page.keyboard.down('Space');
    await page.waitForTimeout(400);
    await page.keyboard.up('Space');
    await expect(page.locator('.recent-list .solve-row')).toHaveCount(1);
    await expect(page.locator('.app')).not.toHaveClass(/is-running/);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  });
}

test('focused controls retain Space and do not time a solve', async ({ page }) => {
  await openTimer(page);
  await page.getByRole('combobox', { name: 'Puzzle' }).focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(400);
  await page.keyboard.up('Space');
  await expect(page.getByRole('listbox')).toBeVisible();
  await expect(page.locator('.app')).not.toHaveClass(/is-running/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  const theme = page.getByRole('button', { name: 'Toggle theme' });
  await theme.focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(400);
  await page.keyboard.up('Space');
  await expect(page.locator('.app')).toHaveClass(/theme-dark/);
  await expect(page.locator('.app')).not.toHaveClass(/is-running/);
  // Fixtures exercise controls while timing is enabled; settings and dialogs disable it.
  await page.evaluate(() => {
    const controls = document.createElement('div');
    controls.id = 'keyboard-controls';
    controls.innerHTML =
      '<select aria-label="Test select"><option>First</option><option>Second</option></select>' +
      '<input type="checkbox" aria-label="Test checkbox">' +
      '<div role="combobox" tabindex="0">Custom select</div>' +
      '<div contenteditable="plaintext-only"><span tabindex="0">Editable text</span></div>';
    document.body.append(controls);
    controls.addEventListener('keydown', (event) => {
      queueMicrotask(() => controls.setAttribute('data-prevented', String(event.defaultPrevented)));
    });
  });
  const controls = page.locator('#keyboard-controls');
  for (const control of [
    page.getByLabel('Test select'),
    controls.getByRole('combobox').filter({ hasText: 'Custom select' }),
    controls.locator('span'),
  ]) {
    await control.focus();
    await page.keyboard.down('Space');
    await page.waitForTimeout(400);
    await expect(controls).toHaveAttribute('data-prevented', 'false');
    await page.keyboard.up('Space');
    await page.keyboard.press('Escape');
    await expect(page.locator('.app')).not.toHaveClass(/is-running/);
  }
  await page.getByLabel('Test checkbox').focus();
  await page.keyboard.press('Space');
  await expect(page.getByLabel('Test checkbox')).toBeChecked();
  await expect(page.locator('.recent-list .solve-row')).toHaveCount(0);
});

for (const interruption of ['focus', 'blur', 'disabled'] as const) {
  test(`${interruption} cancels a pending Space hold`, async ({ page }) => {
    await openTimer(page);
    await page.locator('[data-timer]').focus();
    await page.keyboard.down('Space');
    await expect(page.locator('.timer-hint')).toHaveText('Release to start');
    if (interruption === 'focus') await page.getByRole('button', { name: 'Toggle theme' }).focus();
    if (interruption === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    if (interruption === 'disabled') {
      await page
        .getByRole('button', { name: 'Add manual solve' })
        .evaluate((el: HTMLElement) => el.click());
      await expect(page.getByLabel('Time in seconds')).toBeVisible();
    }
    await page.keyboard.up('Space');
    await expect(page.locator('.app')).not.toHaveClass(/is-running/);
    await expect(page.locator('.recent-list .solve-row')).toHaveCount(0);
    if (interruption === 'disabled') {
      await page.getByRole('button', { name: 'Close dialog' }).click();
    }
    await page.locator('[data-timer]').focus();
    await page.keyboard.down('Space');
    await expect(page.locator('.timer-hint')).toHaveText('Release to start');
    await page.keyboard.up('Space');
    await expect(page.locator('.app')).toHaveClass(/is-running/);
  });
}

test('unowned keyups, handled events and modified shortcuts do not time a solve', async ({
  page,
}) => {
  await openTimer(page);
  const timer = page.locator('[data-timer]');
  await timer.focus();
  await page.keyboard.press('Control+Space');
  await page.keyboard.press('Shift+Space');
  await timer.evaluate((el) => {
    el.addEventListener('keydown', (event) => event.preventDefault(), { once: true });
  });
  await page.keyboard.down('Space');
  await page.waitForTimeout(400);
  await page.keyboard.up('Space');
  await expect(page.locator('.timer-hint')).toHaveText('Hold space to start');
  // A Space release must not release a hold begun with a pointer.
  const bounds = await timer.boundingBox();
  if (!bounds) throw new Error('Timer is not visible');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await expect(page.locator('.timer-hint')).toHaveText('Release to start');
  await page.keyboard.up('Space');
  await expect(page.locator('.app')).not.toHaveClass(/is-running/);
  await page.mouse.up();
  await expect(page.locator('.app')).toHaveClass(/is-running/);
});
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
  await page.getByRole('button', { name: 'Toggle theme' }).click();
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
