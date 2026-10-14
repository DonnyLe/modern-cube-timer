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
  const sessions = page.getByRole('button', { name: 'Edit puzzle and session', exact: true });

  await expect(page.locator('.session-label')).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
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
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Break before a new session (hours)')).toHaveValue('1');
  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await sessions.click();
  await expect(page.getByLabel('Break before a new session (hours)')).toHaveCount(0);
  await expect(page.locator('.manager-session-row')).toHaveCount(2);
  await page.locator('.manager-session-row').last().click();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.locator('.recent-list .solve-row strong')).toHaveText('12.00');
});

test('sessions can be started without a name and custom names stay available', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Start sessions automatically after a break').uncheck();
  await expect(page.getByLabel('Break before a new session (hours)')).toBeDisabled();
  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await page.getByRole('button', { name: 'Edit puzzle and session', exact: true }).click();
  await page.getByRole('button', { name: 'Start new session', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Edit puzzle and session', exact: true }).click();
  await expect(page.locator('.manager-session-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Rename', exact: true }).click();
  await page.getByLabel('Session name', { exact: true }).fill('Competition practice');
  await page.getByRole('button', { name: 'Rename current' }).click();
  await expect(page.getByRole('heading', { name: 'Competition practice' })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('.recent footer')).toContainText('Competition practice');
  await page.getByRole('button', { name: 'Edit puzzle and session', exact: true }).click();
  await expect(page.locator('.puzzle-artwork')).toHaveAttribute('data-mode', /3d|face/, {
    timeout: 30000,
  });
  await page.screenshot({
    path: testInfo.outputPath('sessions-mobile.png'),
    fullPage: true,
  });
});

test('session edit opens the panel and hides while focus mode is active', async ({ page }) => {
  await page.goto('/');
  const edit = page.getByRole('button', { name: 'Edit puzzle and session', exact: true });
  const modal = page.getByRole('dialog', { name: 'Puzzle and sessions', exact: true });

  await edit.click();
  await expect(modal.getByRole('combobox', { name: 'Puzzle', exact: true })).toBeEnabled();
  await expect(modal.getByRole('button', { name: 'Start new session' })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('.session-label')).toHaveCount(0);
  await page.getByRole('button', { name: 'Enter focus mode' }).click();
  await expect(edit).toBeHidden();
  await expect(page.locator('.timer-session-name')).toBeVisible();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('.app')).toHaveClass(/is-focused/);
  await expect(page.locator('.app')).not.toHaveClass(/is-running/);
  await page.keyboard.press('Escape');
  await expect(edit).toBeVisible();
  await edit.click();
  await expect(page.getByRole('button', { name: 'Automatic session settings' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sessions', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Timer', exact: true })).toBeVisible();
  await expect(page.locator('.app')).not.toHaveClass(/is-focused/);
});

test('disabling automatic sessions resumes older sessions when switching puzzles', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Edit puzzle and session' })).toBeEnabled();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('turn-timer');

        request.onsuccess = () => {
          const database = request.result;
          const tx = database.transaction('sessions', 'readwrite');

          tx.objectStore('sessions').put({
            id: 'older-two',
            puzzle: '222',
            name: 'Two practice',
            createdAt: Date.now() - 86400000,
          });

          tx.oncomplete = () => {
            database.close();
            resolve();
          };

          tx.onabort = () => reject(tx.error);
        };
      }),
  );
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Start sessions automatically after a break').uncheck();
  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await page.getByRole('button', { name: 'Edit puzzle and session' }).click();
  await expect(page.locator('.manager-session-row')).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Puzzle', exact: true }).click();
  await expect(page.getByRole('option', { selected: true })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.getByRole('option', { name: '2×2×2', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.manager-details h3')).toHaveText('Two practice');
  await expect(page.locator('.manager-session-row')).toHaveCount(2);
  await expect(page.locator('.manager-notice')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('.timer-session-name')).toHaveText('Two practice');
});
