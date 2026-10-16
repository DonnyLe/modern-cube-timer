import { test, expect } from '@playwright/test';

test('expanded session survives reload, keeps the timer paused, and returns to its picker', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage sessions', exact: true }).click();
  await page.getByRole('button', { name: 'Expand session', exact: true }).click();
  await expect(page.getByRole('main', { name: 'Session details' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.topbar')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
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

test('recent solves entry points open all solves in the expanded session', async ({ page }) => {
  await seedSession(page);
  await page.reload();
  await page.getByRole('button', { name: 'Continue session', exact: true }).click();
  await page.locator('.recent').getByRole('button', { name: 'See all', exact: true }).click();
  await expect(page).toHaveURL(/#session\/expanded-fixture\/solves$/);
  await expect(page.locator('.session-solve-row')).toHaveCount(25);
  await expect(page.locator('.topbar')).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: 'Continue session', exact: true }).click();
  await page.getByRole('button', { name: '65 solves · Fixture practice', exact: true }).click();
  await expect(page).toHaveURL(/#session\/expanded-fixture\/solves$/);
});

test('session trend See all opens graphs and exits focus mode safely', async ({ page }) => {
  await seedSession(page);
  await page.reload();
  await page.getByRole('button', { name: 'Continue session', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Hide widgets in focus mode').uncheck();
  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await page.getByRole('button', { name: 'Enter focus mode', exact: true }).click();
  await expect(page.locator('.app')).toHaveClass(/is-focused/);
  const trend = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Session trend', exact: true }) });

  await trend.getByRole('button', { name: 'See all', exact: true }).click();
  await expect(page).toHaveURL(/#session\/expanded-fixture\/graphs$/);
  await expect(page.getByRole('region', { name: 'Full session trend', exact: true })).toBeVisible();
  await expect(page.locator('.app')).not.toHaveClass(/is-focused/);
  await expect(page.locator('.topbar')).toHaveCSS('opacity', '1');
});

async function seedSession(page: import('@playwright/test').Page, count = 65) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Manage sessions', exact: true })).toBeEnabled();
  const sessionId = await page.evaluate(
    (count) =>
      new Promise<string>((resolve, reject) => {
        const request = indexedDB.open('turn-timer');

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['sessions', 'solves'], 'readwrite');

          tx.objectStore('sessions').put({
            id: 'expanded-fixture',
            name: 'Fixture practice',
            puzzle: '333',
            createdAt: 1800000000000,
          });
          for (let i = 0; i < count; i++)
            tx.objectStore('solves').put({
              id: `expanded-${i}`,
              sessionId: 'expanded-fixture',
              duration: i === 0 ? 480 : 12000 + (i % 10) * 500,
              penalty: i === 17 ? 'DNF' : i === 16 ? '+2' : 'none',
              scramble: "R U2 F' L2 D B2 R' U F2 D' L U2 B' R2 D2 F U' L2 B D'",
              timestamp: 1800000000000 + i * 30000,
              note: i === 10 ? 'Clean finish' : '',
            });

          tx.oncomplete = () => {
            db.close();
            resolve('expanded-fixture');
          };

          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
    count,
  );

  await page.goto(`/#session/${sessionId}/overview`);
  await expect(page.getByRole('heading', { name: 'Fixture practice', exact: true })).toBeVisible();
}

test('overview shows live statistics and readable scrambles on mobile', async ({ page }) => {
  await seedSession(page);
  await expect(page.locator('.session-metrics')).toContainText('65');
  await expect(page.locator('.session-metrics')).toContainText('DNF');
  await expect(page.locator('.session-solve-row')).toHaveCount(5);
  await expect(page.locator('.session-scramble').first()).toContainText("L2 B D'");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.locator('.session-solve-row').first().click();
  await expect(page.getByRole('complementary', { name: 'Solve details' })).toBeVisible();
});

test('solves preserves numbering through search, penalties, sorting, and pagination', async ({
  page,
}) => {
  await seedSession(page);
  await page.getByRole('link', { name: 'Solves', exact: true }).click();
  await expect(page.locator('.session-solve-row')).toHaveCount(25);
  await expect(page.locator('.session-solve-row').first()).toContainText('#65');
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.locator('.session-solve-row').first()).toContainText('#40');
  await page.getByRole('searchbox', { name: 'Search solves' }).fill('Clean finish');
  await expect(page.locator('.session-solve-row')).toHaveCount(1);
  await expect(page.locator('.session-solve-row')).toContainText('#11');
  await page.getByRole('searchbox', { name: 'Search solves' }).fill('');
  await page.getByLabel('Penalty', { exact: true }).selectOption('DNF');
  await expect(page.locator('.session-solve-row')).toHaveCount(1);
  await expect(page.locator('.session-solve-row')).toContainText('#18');
  await page.getByLabel('Penalty', { exact: true }).selectOption('all');
  await page.getByLabel('Order', { exact: true }).selectOption('fastest');
  await expect(page.locator('.session-solve-row').first()).toContainText('#1');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('solve panel saves penalties and notes, supports delete undo, and survives reload', async ({
  page,
}) => {
  await seedSession(page);
  await page.getByRole('link', { name: 'Solves', exact: true }).click();
  await page.getByRole('button', { name: 'Open solve 65:', exact: false }).click();
  const panel = page.getByRole('complementary', { name: 'Solve details' });

  await panel.getByLabel('Time before penalty').fill('12.34');
  await panel.getByLabel('Solve penalty').selectOption('+2');
  await panel.getByLabel('Note', { exact: true }).fill('Saved from session details');
  await panel.getByRole('button', { name: 'Save solve', exact: true }).click();
  await expect(panel.getByRole('status')).toHaveText('Solve saved.');
  await expect(panel.locator('.session-detail-time')).toHaveText('14.34');
  await panel.getByRole('button', { name: 'Delete solve', exact: true }).click();
  await panel.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.locator('.session-solve-row').first()).toContainText('#64');
  await page.getByRole('button', { name: 'Undo delete' }).click();
  await expect(page.locator('.session-solve-row').first()).toContainText('14.34');
  await page.reload();
  await expect(page.locator('.session-solve-row').first()).toContainText(
    'Saved from session details',
  );
});

test('graphs cover the full session and open an attempt by original number', async ({ page }) => {
  await seedSession(page);
  await page.getByRole('link', { name: 'Graphs', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Session trend chart', exact: true })).toBeVisible();
  await expect(page.locator('.session-full-trend')).toContainText('65 solves');
  await page.getByLabel('ao50', { exact: true }).check();
  await page.getByLabel('Horizontal axis', { exact: true }).selectOption('timestamp');
  await page.getByRole('spinbutton', { name: 'Inspect solve number' }).fill('17');
  await page.getByRole('button', { name: 'Open solve', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Solve details' })).toContainText(
    'Solve #17',
  );
});

test('supporting charts link distribution bins and targets back to solves', async ({ page }) => {
  await seedSession(page);
  await page.getByRole('link', { name: 'Graphs', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Time distribution', exact: true })).toBeVisible();
  const target = page.getByRole('region', { name: 'Under target', exact: true });

  await target.getByLabel('Target in seconds').fill('13');
  await target.getByRole('link', { name: 'View matching solves' }).click();
  await expect(page).toHaveURL(/under=13000/);
  await expect(page.locator('.session-solve-row')).not.toHaveCount(0);
  await expect(page.locator('.session-solve-list')).not.toContainText('DNF');
  await page.getByRole('link', { name: 'Graphs', exact: true }).click();
  await page
    .getByRole('region', { name: 'Consistency by block', exact: true })
    .getByRole('link', { name: 'Solves 51–65' })
    .click();
  await expect(page.locator('.session-solve-row')).toHaveCount(15);
});
