import { test, expect, type Page, type Locator } from '@playwright/test';

test.use({ hasTouch: true });

async function seedSolves(page: Page, count: number, allDnf = false) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  await page.evaluate(
    ({ count, allDnf }) =>
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
                penalty: allDnf || i === 18 || i === 19 ? 'DNF' : i === 16 ? '+2' : 'none',
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
    { count, allDnf },
  );
  await page.reload();
}

async function chooseAo12(page: Page) {
  await page.getByRole('combobox', { name: 'Graph type' }).click();
  await page.getByRole('option', { name: 'Rolling ao12', exact: true }).click();
}

async function advanceTo(chart: Locator, page: Page, from: number, to: number) {
  for (let solve = from + 1; solve <= to; solve++) {
    await chart.press('ArrowRight');
    await expect(page.locator('.graph').getByRole('status')).toContainText(`Solve ${solve} ao12:`);
  }
}

test('shared graph browses the full session and calculates rolling averages across windows', async ({
  page,
}) => {
  // Keep penalty cases near the window's start so keyboard checks need only a few steps.
  await seedSolves(page, 65);
  const graph = page.getByRole('group', { name: 'Solve times, solves 16–65', exact: true });
  const detail = page.locator('.graph').getByRole('status');

  await expect(graph).toBeVisible();
  const path = await graph.locator('.recharts-line-curve').getAttribute('d');

  expect(path?.match(/M/g)).toHaveLength(2);
  expect(path).not.toMatch(/NaN|Infinity/);
  const chart = graph.getByRole('application');

  await chart.focus();
  await expect(detail).toHaveText('Solve 16: 12.00');
  await chart.press('ArrowRight');
  await expect(detail).toHaveText('Solve 17: 14.00');
  await chart.press('ArrowLeft');
  await expect(detail).toHaveText('Solve 16: 12.00');

  for (const solve of [17, 18, 19]) {
    await chart.press('ArrowRight');
    await expect(detail).toContainText(`Solve ${solve}:`);
  }

  await expect(detail).toHaveText('Solve 19: DNF');
  await chooseAo12(page);
  const averageChart = page.getByRole('application');

  await page.mouse.move(0, 0);
  await averageChart.focus();
  await expect(detail).toHaveText('Solve 16 ao12: 12.00');
  await averageChart.press('Space');
  await expect(page.locator('.app')).not.toHaveClass(/is-running/);
  await advanceTo(averageChart, page, 16, 19);
  await expect(detail).toHaveText('Solve 19 ao12: 12.20');
  await averageChart.press('ArrowRight');
  await expect(detail).toHaveText('Solve 20 ao12: DNF');
  await page.getByRole('button', { name: 'Older solves' }).click();
  await expect(
    page.getByRole('group', { name: 'Rolling ao12, solves 1–50', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Older solves' })).toBeDisabled();
  await expect(page.locator('.recharts-line-dot')).toHaveCount(28);
  const olderChart = page.getByRole('application');

  await page.mouse.move(0, 0);
  await olderChart.focus();
  await expect(detail).toHaveText('Solve 1 ao12: —');
  await olderChart.blur();
  await page.locator('.recharts-line-dot').first().hover();
  await expect(detail).toHaveText('Solve 12 ao12: 12.00');
  await page.getByRole('button', { name: 'Newer solves' }).click();
  await expect(
    page.getByRole('group', { name: 'Rolling ao12, solves 16–65', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Newer solves' })).toBeDisabled();
});

test('mobile graph explains missing averages and shows point details on tap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedSolves(page, 1);
  await page.locator('.recharts-line-dot').tap();
  await expect(page.locator('.graph').getByRole('status')).toHaveText('Solve 1: 12.00');
  await chooseAo12(page);
  await expect(page.getByText('Rolling ao12 needs 12 solves.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('all-DNF sessions retain markers and accessible details without plotting zero times', async ({
  page,
}) => {
  await seedSolves(page, 12, true);
  await expect(page.locator('.recharts-line-dot')).toHaveCount(0);
  await expect(page.locator('.recharts-reference-line')).toHaveCount(12);
  await page.getByRole('application').focus();
  await expect(page.locator('.graph').getByRole('status')).toHaveText('Solve 1: DNF');
  await chooseAo12(page);
  await expect(page.locator('.recharts-reference-line')).toHaveCount(1);
  const chart = page.getByRole('application');

  await page.mouse.move(0, 0);
  await chart.focus();
  await advanceTo(chart, page, 1, 12);
  await expect(page.locator('.graph').getByRole('status')).toHaveText('Solve 12 ao12: DNF');
});
