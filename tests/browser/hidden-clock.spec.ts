import { test, expect } from '@playwright/test';

test.use({ hasTouch: true });

for (const focused of [false, true]) {
  for (const input of ['keyboard', 'touch'] as const) {
    test(`hidden clock saves and restores the result with ${input} in ${focused ? 'focus' : 'regular'} mode`, async ({
      page,
    }) => {
      if (input === 'touch') await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
        timeout: 30000,
      });
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await page.getByLabel('Hide clock while solving').check();

      if (input === 'touch') {
        await page
          .locator('.range-label')
          .filter({ hasText: 'Hold to start' })
          .getByRole('slider')
          .press('Home');
      }

      await page.getByRole('button', { name: 'Timer', exact: true }).click();
      if (focused) await page.getByRole('button', { name: 'Enter focus mode' }).click();
      const timer = page.locator('[data-timer]');

      await timer.focus();
      await expect(timer).not.toHaveText('Solving...');
      if (input === 'keyboard') {
        await page.keyboard.down('Space');
        await expect(page.locator('.timer-hint')).toHaveText('Release to start');
        await expect(timer).not.toHaveText('Solving...');
        await page.keyboard.up('Space');
      } else await timer.tap();
      await expect(page.locator('.app')).toHaveClass(/is-running/);
      await expect(timer).toHaveText('Solving...');
      await page.waitForTimeout(250);
      if (input === 'keyboard') {
        await page.keyboard.down('Space');
        await page.keyboard.up('Space');
      } else await timer.tap();
      await expect(page.locator('.app')).not.toHaveClass(/is-running/);
      await expect(timer).toHaveText(/^\d+\.\d{2}$/);
      if (focused) await page.getByRole('link', { name: 'Exit focus mode' }).click();
      const result = page.locator('.recent-list .solve-row strong');

      await expect(result).toHaveCount(1);
      await expect(result).toHaveText(await timer.innerText());
      await result.click();
      expect(Number(await page.getByLabel('Time in seconds').inputValue())).toBeGreaterThan(0);
    });
  }
}

test('hidden clock persists, keeps inspection visible, and can be disabled', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const setting = page.getByLabel('Hide clock while solving');

  await expect(setting).not.toBeChecked();
  await setting.check();
  await page.getByLabel('15-second inspection').check();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<boolean>((resolve, reject) => {
            const request = indexedDB.open('turn-timer');

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
              const database = request.result;
              const transaction = database.transaction('settings', 'readonly');
              const row = transaction.objectStore('settings').get('preferences');

              transaction.oncomplete = () => {
                database.close();
                resolve(row.result?.value.hideClockWhileSolving && row.result?.value.inspection);
              };

              transaction.onabort = () => {
                database.close();
                reject(transaction.error);
              };
            };
          }),
      ),
    )
    .toBe(true);
  await page.reload();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(setting).toBeChecked();
  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  const timer = page.locator('[data-timer]');

  await timer.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.timer-hint')).toHaveText('Inspect · hold space when ready');
  await expect(timer).toHaveText(/^\d+$/);
  await page.keyboard.down('Space');
  await expect(page.locator('.timer-hint')).toHaveText('Release to start');
  await expect(timer).toHaveText(/^\d+$/);
  await page.keyboard.up('Space');
  await expect(timer).toHaveText('Solving...');
  await page.keyboard.press('Space');
  await expect(page.locator('.recent-list .solve-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await setting.uncheck();
  await page.getByLabel('15-second inspection').uncheck();
  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await timer.focus();
  await page.keyboard.down('Space');
  await expect(page.locator('.timer-hint')).toHaveText('Release to start');
  await page.keyboard.up('Space');
  await expect(page.locator('.app')).toHaveClass(/is-running/);
  await expect(timer).toHaveText(/^\d+\.\d{2}$/);
  await page.keyboard.press('Space');
  await expect(page.locator('.recent-list .solve-row')).toHaveCount(2);
});
