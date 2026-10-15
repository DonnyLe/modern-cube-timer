import { test, expect, type Page } from '@playwright/test';

test.use({ hasTouch: true });

async function seedSolves(page: Page, count: number) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  await page.evaluate(
    (count) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('turn-timer');

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['settings', 'solves'], 'readwrite');
          const prefs = tx.objectStore('settings').get('preferences');

          prefs.onsuccess = () => {
            for (let i = 0; i < count; i++)
              tx.objectStore('solves').put({
                id: `graph-${i}`,
                sessionId: prefs.result.value.activeSessionId,
                duration: 12000,
                penalty: i === 60 ? '+2' : i === 62 || i === 63 ? 'DNF' : 'none',
                scramble: 'R U',
                timestamp: Date.now() - (count - i) * 1000,
                note: '',
              });
          };

          tx.oncomplete = () => {
            db.close();
            resolve();
          };

          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
    count,
  );
  await page.reload();
}

async function chooseAo12(page: Page) {
  await page.getByRole('combobox', { name: 'Graph type' }).click();
  await page.getByRole('option', { name: 'Rolling ao12', exact: true }).click();
}

test('shared graph browses the full session and calculates rolling averages across windows', async ({
  page,
}) => {
  await seedSolves(page, 65);
  const graph = page.getByRole('group', { name: 'Solve times, solves 16–65', exact: true });

  await expect(graph).toBeVisible();
  await expect(graph.locator('.plot-line')).toHaveCount(2);
  await expect(graph.getByRole('button', { name: 'Solve 61: 14.00', exact: true })).toBeVisible();
  await expect(graph.getByRole('button', { name: 'Solve 63: DNF', exact: true })).toBeVisible();
  await chooseAo12(page);
  const flatPoint = page.getByRole('button', { name: 'Solve 62 ao12: 12.00', exact: true });

  await flatPoint.click();
  await expect(page.locator('.graph-detail')).toHaveText('Solve 62 ao12: 12.00');
  const average = page.getByRole('button', { name: 'Solve 63 ao12: 12.20', exact: true });

  await average.focus();
  await expect(page.locator('.graph-detail')).toHaveText('Solve 63 ao12: 12.20');
  await average.press('Space');
  await expect(page.locator('.app')).not.toHaveClass(/is-running/);
  await expect(page.getByRole('button', { name: 'Solve 64 ao12: DNF', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Solve 16 ao12: 12.00', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Older solves' }).click();
  await expect(
    page.getByRole('group', { name: 'Rolling ao12, solves 1–50', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Older solves' })).toBeDisabled();
  await expect(page.locator('.graph-target')).toHaveCount(39);
  await expect(
    page.getByRole('button', { name: 'Solve 12 ao12: 12.00', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Newer solves' }).click();
  await expect(
    page.getByRole('group', { name: 'Rolling ao12, solves 16–65', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Newer solves' })).toBeDisabled();
});

test('mobile graph explains missing averages and shows point details on tap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedSolves(page, 1);
  const point = page.getByRole('button', { name: 'Solve 1: 12.00', exact: true });

  await point.tap();
  await expect(page.locator('.graph-detail')).toHaveText('Solve 1: 12.00');
  await chooseAo12(page);
  await expect(page.getByText('Rolling ao12 needs 12 solves.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
