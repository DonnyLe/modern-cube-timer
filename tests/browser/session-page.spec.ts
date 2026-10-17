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
  await expect(page.locator('.session-solve-row')).not.toHaveCount(0);
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
  await expect(page).toHaveURL(/#session\/expanded-fixture\/data$/);
  await expect(page.getByRole('region', { name: 'Full session trend', exact: true })).toBeVisible();
  await expect(page.locator('.app')).not.toHaveClass(/is-focused/);
  await expect(page.locator('.topbar')).toHaveCSS('opacity', '1');
});

async function seedSession(page: import('@playwright/test').Page, count = 65, allDnf = false) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Manage sessions', exact: true })).toBeEnabled();
  const sessionId = await page.evaluate(
    ({ count, allDnf }) =>
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
              penalty: allDnf || i === 17 ? 'DNF' : i === 16 ? '+2' : 'none',
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
    { count, allDnf },
  );

  await page.goto(`/#session/${sessionId}/overview`);
  await expect(page.getByRole('heading', { name: 'Fixture practice', exact: true })).toBeVisible();
}

test('overview shows duration, best performances and insight placeholders on mobile', async ({
  page,
}) => {
  await seedSession(page);
  await expect(page.getByRole('region', { name: 'Session length', exact: true })).toContainText(
    '65',
  );
  await expect(page.getByRole('region', { name: 'Best performances', exact: true })).toContainText(
    '0.48',
  );
  await expect(page.locator('.session-insight-placeholder')).toHaveCount(4);
  await expect(page.getByText('Insight content to be defined.', { exact: true })).toHaveCount(4);
  await expect(page.locator('.session-scramble')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('button', { name: 'Open best solve 1:', exact: false }).click();
  await expect(page.getByRole('complementary', { name: 'Solve details' })).toContainText(
    'Solve #1',
  );
});

test('Overview panels and graph expand to fill taller desktop viewports', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedSession(page);
  const chart = page.locator('.session-insight-workspace .graph-chart');
  const originalHeight = await chart.evaluate((element) => element.getBoundingClientRect().height);

  for (const height of [1000, 1200]) {
    await page.setViewportSize({ width: 1440, height });
    await expect
      .poll(async () => {
        const workspace = await page.locator('.session-insight-workspace').boundingBox();

        return height - (workspace!.y + workspace!.height);
      })
      .toBeLessThan(40);
  }

  await expect
    .poll(() => chart.evaluate((element) => element.getBoundingClientRect().height))
    .toBeGreaterThan(originalHeight + 100);
  const graph = await page
    .getByRole('region', { name: 'Session trend overview', exact: true })
    .boundingBox();
  const insights = await page
    .getByRole('region', { name: 'Session insight placeholders', exact: true })
    .boundingBox();

  expect(graph!.x).toBeLessThan(insights!.x);
  expect(Math.abs(graph!.height - insights!.height)).toBeLessThan(2);
});

test('solves preserves numbering through search, penalties, sorting, and scrolling', async ({
  page,
}) => {
  await seedSession(page);
  await page.getByRole('link', { name: 'Solves', exact: true }).click();
  await expect(page.locator('.session-result-count')).toHaveText('65 matching solves');
  await expect(page.locator('.session-solve-row').first()).toContainText('#65');
  const list = page.getByRole('region', { name: 'Scrollable solves', exact: true });

  await list.focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('button', { name: /^Open solve 1:/ })).toBeInViewport();
  await page.getByRole('searchbox', { name: 'Search solves' }).fill('Clean finish');
  await expect(page.locator('.session-result-count')).toHaveText('1 matching solve');
  await expect(page.locator('.session-solve-row')).toContainText('#11');
  await page.getByRole('searchbox', { name: 'Search solves' }).fill('');
  const notesCheckbox = page.getByRole('checkbox', { name: 'With notes', exact: true });

  await page.getByText('With notes', { exact: true }).click();
  await expect(notesCheckbox).toBeChecked();
  await expect(page.locator('.session-result-count')).toHaveText('1 matching solve');
  await expect(page.locator('.session-solve-row')).toContainText('#11');
  await notesCheckbox.focus();
  await page.keyboard.press('Space');
  await expect(notesCheckbox).not.toBeChecked();
  await expect(page.locator('.app')).not.toHaveClass(/is-running/);
  await selectSessionOption(page, 'Penalty', 'DNF');
  await expect(page.locator('.session-result-count')).toHaveText('1 matching solve');
  await expect(page.locator('.session-solve-row')).toContainText('#18');
  await selectSessionOption(page, 'Penalty', 'All results');
  await selectSessionOption(page, 'Order', 'Fastest first');
  await expect(page.locator('.session-solve-row').first()).toContainText('#1');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('large solve lists render a bounded window and remeasure wrapped rows', async ({
  page,
}, testInfo) => {
  await seedSession(page, 2000);
  await page.getByRole('link', { name: 'Solves', exact: true }).click();
  const list = page.getByRole('region', { name: 'Scrollable solves', exact: true });

  await expect(page.locator('.session-result-count')).toHaveText('2000 matching solves');
  await expect(page.getByRole('button', { name: 'Next page' })).toHaveCount(0);
  await expect(page.locator('.session-solve-row').first()).toContainText('#2000');
  expect(await page.locator('.session-solve-row').count()).toBeLessThan(40);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(1000);
  await page.screenshot({ path: testInfo.outputPath('virtual-solves-desktop.png') });
  await list.focus();
  await page.keyboard.press('End');
  const oldest = page.getByRole('button', { name: /^Open solve 1:/ });

  await expect(oldest).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.locator('.session-solve-row').count()).toBeLessThan(40);
  await oldest.click();
  await expect(page.getByRole('complementary', { name: 'Solve details' })).toContainText(
    'Solve #1',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(844);
  await page.getByRole('button', { name: 'Close solve details', exact: true }).click();
  await selectSessionOption(page, 'Order', 'Oldest first');
  await expect(page.locator('.session-solve-row').first()).toContainText('#1');
  await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBe(0);
  await expect
    .poll(async () => {
      const rows = await page.locator('.session-virtual-solve').evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();

          return { top: box.top, bottom: box.bottom };
        }),
      );

      return rows.every((row, index) => index === 0 || row.top >= rows[index - 1].bottom - 1);
    })
    .toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await list.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('virtual-solves-mobile.png') });
  await page.getByRole('button', { name: /^Open solve 1:/ }).click();
  await expect(page.getByRole('complementary', { name: 'Solve details' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('virtual-solves-mobile-details.png') });
  await page.getByRole('button', { name: 'Close solve details', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search solves' }).fill('Clean finish');
  await expect(page.locator('.session-result-count')).toHaveText('1 matching solve');
  await expect(page.locator('.session-solve-row')).toContainText('#11');
  await page.setViewportSize({ width: 390, height: 600 });
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(600);
  expect((await list.boundingBox())!.height).toBeGreaterThan(60);
});

test('solve panel saves penalties and notes, supports delete undo, and survives reload', async ({
  page,
}) => {
  await seedSession(page);
  await page.getByRole('link', { name: 'Solves', exact: true }).click();
  await page.getByRole('button', { name: 'Open solve 65:', exact: false }).click();
  const panel = page.getByRole('complementary', { name: 'Solve details' });

  await panel.getByLabel('Time before penalty').fill('12.34');
  await selectSessionOption(page, 'Solve penalty', '+2');
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
  await page.getByRole('link', { name: 'Data', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Session trend chart', exact: true })).toBeVisible();
  await expect(page.locator('.session-full-trend')).toContainText('65 solves');
  await page.getByRole('checkbox', { name: 'ao50', exact: true }).check();
  await selectSessionOption(page, 'Horizontal axis', 'By time');
  await page.locator('.session-inspect-disclosure > summary').click();
  await page.getByRole('spinbutton', { name: 'Inspect solve number' }).fill('17');
  await page.getByRole('button', { name: 'Open solve', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Solve details' })).toContainText(
    'Solve #17',
  );
});

async function selectSessionOption(
  page: import('@playwright/test').Page,
  label: string,
  option: string,
) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
  await expect(page.getByRole('listbox')).toBeHidden();
}

test('Data groups performance, averages, and consistency beside the main chart', async ({
  page,
}) => {
  await seedSession(page);
  await page.getByRole('link', { name: 'Data', exact: true }).click();
  const stats = page.getByRole('region', { name: 'Session statistics', exact: true });

  await expect(stats.locator(':scope > section')).toHaveCount(3);
  await expect(
    stats.getByRole('table', { name: 'Current and best rolling averages' }),
  ).toContainText('13.00');
  await expect(
    stats.getByRole('region', { name: 'Consistency statistics', exact: true }),
  ).toContainText('13.00 – 15.50');
  const left = await stats.boundingBox();
  const right = await page
    .getByRole('region', { name: 'Full session trend', exact: true })
    .boundingBox();

  expect(right!.x).toBeGreaterThan(left!.x);
  await page.goto('/#session/expanded-fixture/graphs');
  await expect(page.getByRole('link', { name: 'Data', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('supporting charts link distribution bins and targets back to solves', async ({ page }) => {
  await seedSession(page);
  await page.getByRole('link', { name: 'Data', exact: true }).click();
  const histogram = page.getByRole('region', { name: 'Time distribution', exact: true });

  await expect(histogram).toBeVisible();
  await histogram.locator('.session-distribution-bands > summary').click();
  await histogram.getByRole('link').first().click();
  await expect(page).toHaveURL(/solves\?min=\d+&under=\d+$/);
  await page.getByRole('link', { name: 'Data', exact: true }).click();
  const target = page.getByRole('region', { name: 'Under target', exact: true });

  await target.getByLabel('Target in seconds').fill('13');
  await target.getByRole('link', { name: 'View matching solves' }).click();
  await expect(page).toHaveURL(/under=13000/);
  await expect(page.locator('.session-solve-row')).not.toHaveCount(0);
  await expect(page.locator('.session-solve-list')).not.toContainText('DNF');
  await page.getByRole('link', { name: 'Data', exact: true }).click();
  await page.locator('.session-more-charts > summary').click();
  await page
    .getByRole('region', { name: 'Consistency by block', exact: true })
    .getByRole('link', { name: 'Solves 51–65' })
    .click();
  await expect(page.locator('.session-result-count')).toHaveText('15 matching solves');
});

test('empty pages and all-DNF graphs show meaningful states', async ({ page }) => {
  await seedSession(page, 0);

  for (const tab of ['Data', 'Insights', 'Solves']) {
    await page.getByRole('link', { name: tab, exact: true }).click();
    await expect(page.getByRole('main', { name: 'Session details' })).toBeVisible();
  }

  await expect(page.getByText('No solves in this session yet.')).toBeVisible();
  await seedSession(page, 12, true);
  await page.getByRole('link', { name: 'Data', exact: true }).click();
  await expect(page.getByText('No finished solves to plot.')).toBeVisible();
  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  await expect(page.getByText('No valid average of 12 yet.')).toBeVisible();
});

test('best performances open their original solve and exact average windows', async ({ page }) => {
  await seedSession(page);
  await page.getByRole('link', { name: 'View best ao5:', exact: false }).click();
  await expect(page.locator('.session-result-count')).toHaveText('5 matching solves');
  await expect(page).toHaveURL(/solves\?from=\d+&to=\d+$/);
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await page.getByRole('link', { name: 'View best ao12:', exact: false }).click();
  await expect(page.locator('.session-result-count')).toHaveText('12 matching solves');
});

test('insights link exact best-average windows to their original solves', async ({ page }) => {
  await seedSession(page);
  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What changed as you practiced' })).toBeVisible();
  await page.getByRole('link', { name: 'View these 12 solves' }).click();
  await expect(page.locator('.session-result-count')).toHaveText('12 matching solves');
  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  await page.getByRole('link', { name: 'Closing solves', exact: false }).click();
  await expect(page.locator('.session-result-count')).toHaveText('16 matching solves');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('session pages retain the app theme and fit mobile screens', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await seedSession(page);
  await expect(page.locator('.app')).toHaveClass(/theme-dark/);

  for (const tab of ['Overview', 'Data', 'Solves', 'Insights']) {
    await page.getByRole('link', { name: tab, exact: true }).click();
    await expect(page.getByRole('link', { name: tab, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await page.screenshot({
      path: testInfo.outputPath(`session-${tab.toLowerCase()}-desktop.png`),
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });

  for (const tab of ['Overview', 'Data', 'Solves', 'Insights']) {
    await page.getByRole('link', { name: tab, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await page.screenshot({
      path: testInfo.outputPath(`session-${tab.toLowerCase()}-mobile.png`),
      fullPage: true,
    });

    if (tab === 'Data') {
      await page
        .getByRole('region', { name: 'Under target', exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath('session-data-mobile-scrolled.png') });
    }
  }

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('.app')).toHaveClass(/theme-light/);
});
