import { test, expect } from '@playwright/test';

async function seedOldSolve(page: import('@playwright/test').Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('turn-timer');

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
          const database = request.result;
          const tx = database.transaction(['settings', 'solves'], 'readwrite');
          const prefs = tx.objectStore('settings').get('preferences');

          prefs.onsuccess = () => {
            tx.objectStore('solves').put({
              id: 'old-solve',
              sessionId: prefs.result.value.activeSessionId,
              duration: 12000,
              penalty: 'none',
              scramble: 'R U',
              timestamp: Date.now() - 2 * 3_600_000,
              note: '',
            });
          };

          tx.oncomplete = () => {
            database.close();
            resolve();
          };

          tx.onabort = () => {
            database.close();
            reject(tx.error);
          };
        };
      }),
  );
  await page.reload();
}

async function addSolve(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Add manual solve', exact: true }).click();
  await page.getByLabel('Time in seconds').fill('15.25');
  await page.getByRole('button', { name: 'Save solve', exact: true }).click();
}

test('automatic sessions use the saved break setting and retain previous history', async ({
  page,
}) => {
  await page.goto('/');
  const sessions = page.locator('.session-label');

  await expect(sessions).toContainText(/(Morning|Afternoon|Evening|Night) 3x3 session/);
  await sessions.click();
  await expect(page.getByLabel('Start sessions automatically after a break')).toBeChecked();
  await expect(page.getByLabel('Break before a new session (hours)')).toHaveValue('4');
  await page.getByLabel('Break before a new session (hours)').fill('1');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const request = indexedDB.open('turn-timer');

            request.onsuccess = () => {
              const database = request.result;
              const tx = database.transaction('settings');
              const row = tx.objectStore('settings').get('preferences');

              tx.oncomplete = () => {
                database.close();
                resolve(row.result.value.sessionBreakHours);
              };
            };
          }),
      ),
    )
    .toBe(1);
  await seedOldSolve(page);
  await expect(page.locator('.recent-list .solve-row')).toHaveCount(1);
  await addSolve(page);
  await expect(page.locator('.recent-list .solve-row')).toHaveCount(1);
  await expect(page.locator('.recent-list .solve-row strong')).toHaveText('15.25');
  await sessions.click();
  await expect(page.getByLabel('Break before a new session (hours)')).toHaveValue('1');
  await expect(page.locator('.session-list button')).toHaveCount(2);
  await page.locator('.session-list button').last().click();
  await expect(page.locator('.recent-list .solve-row strong')).toHaveText('12.00');
});

test('sessions can be started without a name and custom names stay available', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.session-label').click();
  await page.getByLabel('Start sessions automatically after a break').uncheck();
  await expect(page.getByLabel('Break before a new session (hours)')).toBeDisabled();
  await page.getByRole('button', { name: 'Start new session', exact: true }).click();
  await page.locator('.session-label').click();
  await expect(page.locator('.session-list button')).toHaveCount(2);
  await page.getByLabel('Session name', { exact: true }).fill('Competition practice');
  await page.getByRole('button', { name: 'Rename current' }).click();
  await expect(page.locator('.session-label')).toHaveText('Competition practice');
  await page.locator('.session-label').click();
  await page.screenshot({
    path: testInfo.outputPath('sessions-mobile.png'),
    fullPage: true,
  });
});
