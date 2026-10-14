import { test, expect } from '@playwright/test';

test('puzzle changes create a session with a notice or resume recent activity', async ({
  page,
}) => {
  await page.goto('/');
  const edit = page.getByRole('button', { name: 'Edit puzzle and session', exact: true });

  await expect(page.locator('.timer-session-name')).toContainText('3x3 session');
  await edit.click();
  const picker = page.getByRole('combobox', { name: 'Puzzle', exact: true });

  const chooseTwo = async () => {
    await picker.click();
    await expect(page.getByRole('option', { selected: true })).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.getByRole('option', { name: '2×2×2', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
  };

  await chooseTwo();
  await expect(page.locator('.manager-notice')).toContainText('Made a new 2x2 session titled');
  const title = await page.locator('.manager-details h3').textContent();

  await expect(page.locator('.manager-notice')).toContainText(title!);
  await expect(picker).toHaveText('2×2×2');
  await expect(page.locator('.timer-session-name')).toContainText('3x3 session');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('.timer-session-name')).toContainText('2x2 session');
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('turn-timer');

        request.onsuccess = () => {
          const database = request.result;
          const tx = database.transaction(['sessions', 'solves'], 'readwrite');
          const sessions = tx.objectStore('sessions').getAll();

          sessions.onsuccess = () => {
            const session = sessions.result.find((entry) => entry.puzzle === '222');

            tx.objectStore('sessions').put({ ...session, createdAt: Date.now() - 24 * 3_600_000 });
            tx.objectStore('solves').put({
              id: 'recent-two',
              sessionId: session.id,
              timestamp: Date.now() - 3 * 3_600_000,
              duration: 12000,
              penalty: 'none',
              scramble: 'R U',
              note: '',
            });
          };

          tx.oncomplete = () => {
            database.close();
            resolve();
          };

          tx.onabort = () => reject(tx.error);
        };
      }),
  );
  await edit.click();
  await picker.click();
  await expect(page.getByRole('option', { selected: true })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.getByRole('option', { name: '2×2×2', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: '3×3×3', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(picker).toHaveText('3×3×3');
  await chooseTwo();
  await expect(picker).toHaveText('2×2×2');
  await expect(page.locator('.manager-notice')).toHaveCount(0);
  await expect(page.locator('.manager-session-row')).toHaveCount(2);
});

test('browsing applies selection only when the manager closes and history follows the preview', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add manual solve', exact: true }).click();
  await page.getByLabel('Time in seconds').fill('12.84');
  await page.getByRole('button', { name: 'Save solve', exact: true }).click();
  const edit = page.getByRole('button', { name: 'Edit puzzle and session', exact: true });
  const modal = page.getByRole('dialog', { name: 'Puzzle and sessions', exact: true });

  await edit.click();
  await page.getByRole('button', { name: 'Start new session', exact: true }).click();
  await expect(modal).toBeVisible();
  await expect(page.locator('.manager-session-row')).toHaveCount(2);
  await expect(page.locator('.manager-session-row').last()).toContainText('Current');
  await expect(page.locator('.recent-list')).toContainText('12.84');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('.recent-list')).toHaveCount(0);
  await edit.click();
  await page.locator('.manager-session-row').last().click();
  await expect(page.getByRole('region', { name: 'Selected session' })).toContainText('12.84');
  await expect(page.locator('.manager-session-row').first()).toContainText('Current');
  await expect(page.locator('.manager-session-row').last()).toHaveAttribute('aria-pressed', 'true');
  await page
    .locator('.manager-session-entry')
    .last()
    .getByRole('button', { name: /^Session actions/ })
    .click();
  await expect(page.getByRole('menuitem', { name: 'Delete session', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(modal).toBeVisible();
  await expect(page.getByText('Manage session', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue session' })).toHaveCount(0);
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
  await expect(modal).toBeVisible();
  await expect(page.locator('.recent-list')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close dialog' }).click();
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
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('search and filters scope Select all, bulk deletion retains other history, and row menus delete individually', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit puzzle and session' }).click();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('turn-timer');

        request.onsuccess = () => {
          const database = request.result;
          const tx = database.transaction(['sessions', 'solves'], 'readwrite');

          for (const [id, puzzle, name] of [
            ['two-a', '222', 'Two practice A'],
            ['two-b', '222', 'Two practice B'],
            ['old', 'pyram', 'Older practice'],
          ]) {
            tx.objectStore('sessions').put({
              id,
              puzzle,
              name,
              createdAt: Date.now() - (id === 'old' ? 10 : 1) * 86400000,
            });
            tx.objectStore('solves').put({
              id: `solve-${id}`,
              sessionId: id,
              duration: 12000,
              penalty: 'none',
              timestamp: Date.now(),
              scramble: 'R U',
              note: '',
            });
          }

          tx.oncomplete = () => {
            database.close();
            resolve();
          };

          tx.onabort = () => reject(tx.error);
        };
      }),
  );
  await page.reload();
  await page.getByRole('button', { name: 'Edit puzzle and session' }).click();
  await expect(page.locator('.manager-session-row')).toHaveCount(4);
  await expect(page.locator('.manager-puzzle-icon[data-status="ready"]')).toHaveCount(4, {
    timeout: 60000,
  });
  await page.getByRole('button', { name: 'Filter sessions', exact: true }).click();
  await page.getByRole('combobox', { name: 'Filter by puzzle' }).click();
  await expect(page.getByRole('option', { selected: true })).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: '2×2×2', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.manager-session-row')).toHaveCount(2);
  await page.getByLabel('Search sessions').fill('A');
  await expect(page.locator('.manager-session-row')).toHaveCount(2);
  await page.getByLabel('Search sessions').fill('practice A');
  await expect(page.locator('.manager-session-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Select sessions', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Select all visible sessions' }).check();
  await expect(
    page.getByRole('checkbox', { name: 'Select Two practice A', exact: true }),
  ).toBeChecked();
  await page.getByLabel('Search sessions').fill('');
  await expect(
    page.getByRole('checkbox', { name: 'Select Two practice B', exact: true }),
  ).not.toBeChecked();
  await page.getByRole('checkbox', { name: 'Select all visible sessions' }).check();
  await page.getByRole('button', { name: 'Delete selected sessions', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Delete 2 selected sessions');
  await page.getByRole('button', { name: 'Delete sessions', exact: true }).click();
  await expect(page.locator('.manager-session-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.locator('.manager-session-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Select sessions', exact: true }).click();
  await page
    .getByRole('button', { name: 'Session actions for Older practice', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Delete session', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Older practice');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.manager-session-row')).toHaveCount(2);
  await page
    .getByRole('button', { name: 'Session actions for Older practice', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Delete session', exact: true }).click();
  await page.getByRole('button', { name: 'Delete session', exact: true }).click();
  await expect(page.locator('.manager-session-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Select sessions', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Select all visible sessions' }).check();
  await page.getByRole('button', { name: 'Delete selected sessions', exact: true }).click();
  await page.getByRole('button', { name: 'Delete session', exact: true }).click();
  await expect(page.locator('.manager-session-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const request = indexedDB.open('turn-timer');

            request.onsuccess = () => {
              const database = request.result;
              const tx = database.transaction('solves');
              const count = tx.objectStore('solves').count();

              tx.oncomplete = () => {
                database.close();
                resolve(count.result);
              };
            };
          }),
      ),
    )
    .toBe(0);
});
