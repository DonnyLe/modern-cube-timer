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
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });

  await expect(navigation).toBeVisible();
  const timerTab = navigation.getByRole('button', { name: 'Timer', exact: true });

  await expect(timerTab).toHaveAttribute('aria-current', 'page');
  await expect(timerTab.locator('.segmented-selection')).toBeVisible();
  await expect(page).toHaveURL(/#\/?session\/.+\/overview$/);
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
  await page.getByRole('button', { name: 'Back to Timer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Manage sessions', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('recent solves entry points open all solves in the expanded session', async ({ page }) => {
  await seedSession(page);
  await page.reload();
  await page.getByRole('button', { name: 'Continue session', exact: true }).click();
  await page.locator('.recent').getByRole('button', { name: 'See all', exact: true }).click();
  await expect(page).toHaveURL(/#\/?session\/expanded-fixture\/solves$/);
  await expect(page.locator('.session-solve-row')).toHaveCount(25);
  await expect(page.getByRole('button', { name: 'Back to Timer', exact: true })).toBeVisible();
  await expect(page.locator('.topbar')).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: 'Continue session', exact: true }).click();
  await page.getByRole('button', { name: '65 solves · Fixture practice', exact: true }).click();
  await expect(page).toHaveURL(/#\/?session\/expanded-fixture\/solves$/);
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
  await expect(page).toHaveURL(/#\/?session\/expanded-fixture\/graphs$/);
  await expect(page.getByRole('region', { name: 'Full session trend', exact: true })).toBeVisible();
  await expect(page.locator('.app')).not.toHaveClass(/is-focused/);
  await expect(page.locator('.topbar')).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: 'Back to Timer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Manage sessions', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('session title opens Overview independently of widgets and keeps its return context', async ({
  page,
}) => {
  await seedSession(page);
  await page.reload();
  await page.getByRole('button', { name: 'Continue session', exact: true }).click();
  const entry = page.getByRole('button', { name: 'View session: Fixture practice', exact: true });

  await expect(entry).toBeVisible();
  await expect(
    page
      .locator('.focus-widgets')
      .getByRole('button', { name: 'View session: Fixture practice', exact: true }),
  ).toHaveCount(0);
  await entry.click();
  await expect(page).toHaveURL(/session\/expanded-fixture\/overview$/);
  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  await page.getByRole('link', { name: 'View all 1 annotated solves →', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Back to Timer', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to Timer', exact: true }).click();
  await expect(entry).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('picker entry keeps All sessions through filtered solves, reload and browser history', async ({
  page,
}) => {
  await seedSession(page);
  await page.reload();
  await page.getByRole('button', { name: 'All sessions', exact: true }).click();
  await page.getByRole('button', { name: 'Expand session', exact: true }).click();
  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  await page.getByRole('link', { name: 'View all 1 annotated solves →', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'All sessions', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.goBack();
  await page.getByRole('button', { name: 'All sessions', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Puzzle and sessions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fixture practice', exact: true })).toBeVisible();
});

for (const reducedMotion of [false, true]) {
  test(`session navigation fades without a loading screen (reduced motion: ${reducedMotion})`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
    await seedSession(page);
    await page.reload();
    await page.getByRole('button', { name: 'Continue session', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'View session: Fixture practice', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.app > .page-fade-stack > .page-fade:not([aria-hidden])')).toHaveCSS(
      'opacity',
      '1',
    );
    await page.evaluate(() => {
      const observation = { loading: false, samples: [] as number[], headers: [] as number[] };
      const observer = new MutationObserver(() => {
        if (document.body.textContent?.includes('Opening session…')) observation.loading = true;
      });

      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      const started = performance.now();

      const sample = () => {
        for (const element of document.querySelectorAll('.page-fade'))
          observation.samples.push(Number(getComputedStyle(element).opacity));
        const header = document.querySelector('.topbar');

        if (header) observation.headers.push(Number(getComputedStyle(header).opacity));
        if (performance.now() - started < 1200) requestAnimationFrame(sample);
        else observer.disconnect();
      };

      requestAnimationFrame(sample);
      Object.assign(window, { sessionTransitionObservation: observation });
    });
    await page.getByRole('button', { name: 'View session: Fixture practice', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Fixture practice', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.app > .page-fade-stack > .page-fade:not([aria-hidden])')).toHaveCSS(
      'opacity',
      '1',
    );
    await page.getByRole('link', { name: 'Graphs', exact: true }).click();
    await expect(
      page.getByRole('region', { name: 'Full session trend', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.session-page .page-fade:not([aria-hidden])')).toHaveCSS(
      'opacity',
      '1',
    );
    const observation = await page.evaluate(
      () =>
        (
          window as unknown as {
            sessionTransitionObservation: {
              loading: boolean;
              samples: number[];
              headers: number[];
            };
          }
        ).sessionTransitionObservation,
    );

    expect(observation.loading).toBe(false);
    expect(observation.headers.every((opacity) => opacity === 1)).toBe(true);
    expect(observation.samples.some((opacity) => opacity > 0 && opacity < 1)).toBe(!reducedMotion);
    await testInfo.attach('rendered-opacity-samples', {
      body: JSON.stringify(observation),
      contentType: 'application/json',
    });
  });
}

for (const reducedMotion of [false, true]) {
  test(`picker opens before its timer background fades in (reduced motion: ${reducedMotion})`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
    await seedSession(page);
    await page.reload();
    await expect(page.locator('.session-page .page-fade:not([aria-hidden])')).toHaveCSS(
      'opacity',
      '1',
    );
    await page.evaluate(() => {
      const handoff = {
        samples: [] as { opacity: number | null; settled: boolean }[],
        finished: false,
      };

      Object.assign(window, { pickerHandoff: handoff });

      const sample = () => {
        const modal = document.querySelector('[role="dialog"]');

        if (modal) {
          const timer = document.querySelector('.workspace-default');
          const fade = timer?.closest('.page-fade');

          handoff.samples.push({
            opacity: fade ? Number(getComputedStyle(fade).opacity) : null,
            settled:
              getComputedStyle(modal).transform === 'none' &&
              Number(getComputedStyle(modal).opacity) === 1,
          });
        }

        if (handoff.samples.filter((sample) => sample.opacity === 1).length < 6)
          requestAnimationFrame(sample);
        else handoff.finished = true;
      };

      requestAnimationFrame(sample);
    });
    await page.getByRole('button', { name: 'All sessions', exact: true }).click();
    await expect(
      page.getByRole('dialog', { name: 'Puzzle and sessions', exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { pickerHandoff: { finished: boolean } }).pickerHandoff.finished,
        ),
      )
      .toBe(true);
    const samples = await page.evaluate(
      () =>
        (
          window as unknown as {
            pickerHandoff: { samples: { opacity: number | null; settled: boolean }[] };
          }
        ).pickerHandoff.samples,
    );

    expect(
      samples
        .filter((sample) => sample.opacity !== null && sample.opacity > 0)
        .every((sample) => sample.settled),
    ).toBe(true);

    if (!reducedMotion) {
      expect(samples.some((sample) => sample.opacity === null || sample.opacity === 0)).toBe(true);
      expect(
        samples.some(
          (sample) => sample.opacity !== null && sample.opacity > 0 && sample.opacity < 1,
        ),
      ).toBe(true);
    }

    await testInfo.attach('picker-background-frames', {
      body: JSON.stringify(samples),
      contentType: 'application/json',
    });
    await page.screenshot({ path: testInfo.outputPath('picker-after-return.png') });
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Manage sessions', exact: true })).toBeEnabled();
  });
}

test('closing the picker during its entrance releases the timer background', async ({ page }) => {
  await seedSession(page);
  await page.reload();
  await page.getByRole('button', { name: 'All sessions', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click({ force: true });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.app > .page-fade-stack > .page-fade:not([aria-hidden])')).toHaveCSS(
    'opacity',
    '1',
  );
  await expect(page.getByRole('button', { name: 'Manage sessions', exact: true })).toBeEnabled();
});

for (const reducedMotion of [false, true]) {
  for (const action of ['Expand session', 'View all']) {
    test(`picker closes before ${action} fades in (reduced motion: ${reducedMotion})`, async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
      await seedSession(page);
      await page.reload();
      await page.getByRole('button', { name: 'Continue session', exact: true }).click();
      await page.getByRole('button', { name: 'Manage sessions', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCSS('transform', 'none');
      await page.evaluate(() => {
        const observation = {
          samples: [] as { overlay: boolean; session: boolean; opacity: number }[],
          done: false,
        };

        Object.assign(window, { sessionOpening: observation });

        const sample = () => {
          const session = document.querySelector('.session-page');
          const fade = session?.closest('.page-fade');

          observation.samples.push({
            overlay: !!document.querySelector('[role="dialog"], .dialog-backdrop'),
            session: !!session,
            opacity: fade ? Number(getComputedStyle(fade).opacity) : 0,
          });
          if (observation.samples.filter((item) => item.session && item.opacity === 1).length < 6)
            requestAnimationFrame(sample);
          else observation.done = true;
        };

        requestAnimationFrame(sample);
      });
      await page.getByRole('button', { name: action, exact: true }).click();
      await expect(page.getByRole('main', { name: 'Session details' })).toBeVisible();
      await expect(page).toHaveURL(action === 'Expand session' ? /overview$/ : /solves$/);
      await expect
        .poll(() =>
          page.evaluate(
            () => (window as unknown as { sessionOpening: { done: boolean } }).sessionOpening.done,
          ),
        )
        .toBe(true);
      const samples = await page.evaluate(
        () =>
          (
            window as unknown as {
              sessionOpening: {
                samples: { overlay: boolean; session: boolean; opacity: number }[];
              };
            }
          ).sessionOpening.samples,
      );

      expect(samples.some((item) => item.overlay && item.session)).toBe(false);
      if (!reducedMotion)
        expect(samples.some((item) => item.session && item.opacity > 0 && item.opacity < 1)).toBe(
          true,
        );
      await testInfo.attach('modal-exit-then-page-fade-frames', {
        body: JSON.stringify(samples),
        contentType: 'application/json',
      });
    });
  }
}

async function selectSessionOption(
  page: import('@playwright/test').Page,
  label: string,
  option: string,
) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
  await expect(page.getByRole('listbox')).toBeHidden();
}

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
  const notesCheckbox = page.getByRole('checkbox', { name: 'With notes', exact: true });

  await page.getByText('With notes', { exact: true }).click();
  await expect(notesCheckbox).toBeChecked();
  await expect(page.locator('.session-solve-row')).toHaveCount(1);
  await expect(page.locator('.session-solve-row')).toContainText('#11');
  await notesCheckbox.focus();
  await page.keyboard.press('Space');
  await expect(notesCheckbox).not.toBeChecked();
  await expect(page.locator('.app')).not.toHaveClass(/is-running/);
  await selectSessionOption(page, 'Penalty', 'DNF');
  await expect(page.locator('.session-solve-row')).toHaveCount(1);
  await expect(page.locator('.session-solve-row')).toContainText('#18');
  await selectSessionOption(page, 'Penalty', 'All results');
  await selectSessionOption(page, 'Order', 'Fastest first');
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
  await page.getByRole('link', { name: 'Graphs', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Session trend chart', exact: true })).toBeVisible();
  await expect(page.locator('.session-full-trend')).toContainText('65 solves');
  await page.getByRole('checkbox', { name: 'ao50', exact: true }).check();
  await selectSessionOption(page, 'Horizontal axis', 'By time');
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

test('insights link exact best-average windows to their original solves', async ({ page }) => {
  await seedSession(page);
  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What changed as you practiced' })).toBeVisible();
  await page.getByRole('link', { name: 'View these 12 solves' }).click();
  await expect(page.locator('.session-solve-row')).toHaveCount(12);
  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  await page.getByRole('link', { name: 'Closing solves', exact: false }).click();
  await expect(page.locator('.session-solve-row')).toHaveCount(16);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('review and annotated solves retain source records and provide a clear filter reset', async ({
  page,
}) => {
  await seedSession(page);
  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  const review = page.getByRole('region', { name: 'Results to review', exact: true });

  await expect(review).toContainText('0.48');
  await review.getByRole('link', { name: /Review all/ }).click();
  await expect(page.locator('.session-solve-row')).toHaveCount(3);
  await page.getByRole('link', { name: 'Show all solves' }).click();
  await expect(page.getByRole('status').filter({ hasText: '65 matching solves' })).toBeVisible();
  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  await page.getByRole('link', { name: /View all 1 annotated solves/ }).click();
  await expect(page.locator('.session-solve-row')).toHaveCount(1);
  await expect(page.locator('.session-solve-row')).toContainText('#11');
});

test('empty pages and all-DNF graphs show meaningful states', async ({ page }) => {
  await seedSession(page, 0);

  for (const tab of ['Graphs', 'Insights', 'Solves']) {
    await page.getByRole('link', { name: tab, exact: true }).click();
    await expect(page.getByRole('main', { name: 'Session details' })).toBeVisible();
  }

  await expect(page.getByText('No solves in this session yet.')).toBeVisible();
  await seedSession(page, 12, true);
  await page.getByRole('link', { name: 'Graphs', exact: true }).click();
  await expect(page.getByText('No finished solves to plot.')).toBeVisible();
  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  await expect(page.getByText('No valid average of 12 yet.')).toBeVisible();
});

test('session pages retain the app theme and fit mobile screens', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await seedSession(page);
  await expect(page.locator('.app')).toHaveClass(/theme-dark/);

  for (const tab of ['Overview', 'Graphs', 'Solves', 'Insights']) {
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

  for (const tab of ['Overview', 'Graphs', 'Solves', 'Insights']) {
    await page.getByRole('link', { name: tab, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  }

  await page.screenshot({
    path: testInfo.outputPath('session-insights-mobile.png'),
    fullPage: true,
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('.app')).toHaveClass(/theme-light/);
});

test('router preserves legacy links, browser history, and solve filters across reloads', async ({
  page,
}) => {
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  const timerTab = navigation.getByRole('button', { name: 'Timer', exact: true });
  const settingsTab = navigation.getByRole('button', { name: 'Settings', exact: true });

  // The fixture starts on the old #session/... URL, which remains supported.
  await seedSession(page);
  await page.getByRole('link', { name: 'Graphs', exact: true }).click();
  await expect(page).toHaveURL(/#\/session\/expanded-fixture\/graphs$/);
  await expect(timerTab.locator('.segmented-selection')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.goForward();
  await expect(page.getByRole('link', { name: 'Graphs', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page
    .getByRole('region', { name: 'Under target', exact: true })
    .getByLabel('Target in seconds')
    .fill('13');
  await page.getByRole('link', { name: 'View matching solves', exact: false }).click();
  await expect(page).toHaveURL(/solves\?under=13000$/);
  await expect(page.locator('.session-solve-row').first()).toBeVisible();
  const count = await page.locator('.session-solve-row').count();

  expect(count).toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator('.session-solve-row')).toHaveCount(count);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(settingsTab.locator('.segmented-selection')).toBeVisible();
  await expect(timerTab.locator('.segmented-selection')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Color mode' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/solves\?under=13000$/);
  await expect(page.locator('.session-solve-row')).toHaveCount(count);
  await expect(timerTab).toHaveAttribute('aria-current', 'page');
  await expect(timerTab.locator('.segmented-selection')).toBeVisible();
});

test('router resolves session index and unknown tabs to Overview', async ({ page }) => {
  await seedSession(page);

  for (const suffix of ['', '/unknown-tab', '/unknown/nested']) {
    await page.goto(`/#/session/expanded-fixture${suffix}`);
    await expect(page).toHaveURL(/#\/session\/expanded-fixture\/overview$/);
    await expect(page.getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  }
});
