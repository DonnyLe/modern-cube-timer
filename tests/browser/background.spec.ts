import { test, expect, type Page } from '@playwright/test';

test('continuous motion and its static alternatives persist on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const motion = page.getByLabel('Continuous background motion');
  const speed = page.getByRole('slider', { name: 'Motion speed' });

  await expect(motion).toBeChecked();
  await expect(motion).toHaveAccessibleDescription(/even without moving your cursor/);
  await motion.uncheck();
  await expect(speed).toBeDisabled();
  await page.getByRole('radio', { name: 'Solid', exact: true }).check();
  await expect(motion).toHaveCount(0);
  await expect(page.locator('.background canvas')).toBeHidden();
  // Wait for the asynchronous workspace write before reloading.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const request = indexedDB.open('turn-timer');

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
              const database = request.result;
              const transaction = database.transaction('settings', 'readonly');
              const row = transaction.objectStore('settings').get('workspace');

              transaction.oncomplete = () => {
                database.close();
                resolve(row.result?.value.appearance);
              };

              transaction.onabort = () => {
                database.close();
                reject(transaction.error);
              };
            };
          }),
      ),
    )
    .toMatchObject({ motion: false, background: 'solid' });
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Solid', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: 'Flowing', exact: true }).check();
  await expect(motion).toBeEnabled();
  await expect(motion).not.toBeChecked();
  await motion.check();
  await expect(speed).toBeEnabled();
});

// Observe real shader output parameters without adding test hooks to the app.
async function observeBackground(page: Page) {
  await page.addInitScript(() => {
    const probe = { time: 0, draws: 0, capture: false, pixels: [] as number[] };

    Object.assign(window, { backgroundProbe: probe });
    const names = new WeakMap<WebGLUniformLocation, string>();
    const prototype = WebGLRenderingContext.prototype;
    const getUniformLocation = prototype.getUniformLocation;
    const uniform1f = prototype.uniform1f;
    const drawArrays = prototype.drawArrays;
    let background = false;

    prototype.getUniformLocation = function (program, name) {
      const location = getUniformLocation.call(this, program, name);

      if (location) names.set(location, name);

      return location;
    };

    prototype.uniform1f = function (location, value) {
      if (location && names.get(location) === 'time') {
        probe.time = value;
        background = true;
      }

      uniform1f.call(this, location, value);
    };

    prototype.drawArrays = function (mode, first, count) {
      if (background) probe.draws++;
      background = false;
      drawArrays.call(this, mode, first, count);

      if (probe.capture) {
        const pixels = new Uint8Array(this.drawingBufferWidth * this.drawingBufferHeight * 4);

        this.readPixels(
          0,
          0,
          this.drawingBufferWidth,
          this.drawingBufferHeight,
          this.RGBA,
          this.UNSIGNED_BYTE,
          pixels,
        );
        probe.pixels = [];

        // Sample colors across the image; omit alpha, which never changes.
        for (let i = 0; i < pixels.length; i += 256) {
          probe.pixels.push(pixels[i], pixels[i + 1], pixels[i + 2]);
        }

        probe.capture = false;
      }
    };
  });
}

const snapshot = (page: Page) =>
  page.evaluate(() => {
    const probe = (window as unknown as { backgroundProbe: { time: number; draws: number } })
      .backgroundProbe;

    return { ...probe };
  });

async function expectStopped(page: Page) {
  let before = await snapshot(page);

  // Media-query changes can dispatch after emulateMedia resolves, especially in Safari.
  await expect(async () => {
    before = await snapshot(page);
    await page.waitForTimeout(200);
    expect(await snapshot(page)).toEqual(before);
  }).toPass({ timeout: 3000 });

  return before;
}

test('background moves without input, pauses safely, and bounds mobile rendering work', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await observeBackground(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New scramble', exact: true })).toBeEnabled({
    timeout: 30000,
  });
  const initial = await snapshot(page);

  await expect.poll(async () => (await snapshot(page)).time).toBeGreaterThan(initial.time);
  const before = await snapshot(page);

  await page.waitForTimeout(1000);
  const after = await snapshot(page);

  expect(after.draws - before.draws).toBeGreaterThan(0);
  expect(after.draws - before.draws).toBeLessThanOrEqual(35);
  const pixels = await page.locator('.background canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;

    return canvas.width * canvas.height;
  });

  expect(pixels).toBeLessThanOrEqual(2_005_000);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('15-second inspection').check();
  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await page.locator('[data-timer]').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.timer-hint')).toHaveText('Inspect · hold space when ready');
  const inspecting = await expectStopped(page);

  await page.keyboard.down('Space');
  await expect(page.locator('.timer-hint')).toHaveText('Release to start');
  await page.keyboard.up('Space');
  await expect(page.locator('.app')).toHaveClass(/is-running/);
  expect((await expectStopped(page)).time).toBe(inspecting.time);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).time).toBeGreaterThan(inspecting.time);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expectStopped(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const reduced = await snapshot(page);

  await expect.poll(async () => (await snapshot(page)).time).toBeGreaterThan(reduced.time);
  // Exercise the same visibility event used when switching tabs, deterministically across browsers.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('resize'));
  });
  const hidden = await expectStopped(page);

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await snapshot(page)).time).toBeGreaterThan(hidden.time);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Continuous background motion').uncheck();
  await expectStopped(page);
  await page.getByRole('radio', { name: 'Solid', exact: true }).check();
  await expectStopped(page);
});

test('gradient colors visibly change within three seconds in both themes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await observeBackground(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();

  for (const dark of [false, true]) {
    await page.getByRole('combobox', { name: 'Color mode' }).click();
    await page.getByRole('option', { name: dark ? 'Night' : 'Day', exact: true }).click();

    const capture = async () => {
      await page.evaluate(() => {
        const probe = (window as unknown as { backgroundProbe: { capture: boolean } })
          .backgroundProbe;

        probe.capture = true;
      });
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as unknown as { backgroundProbe: { capture: boolean } }).backgroundProbe
                .capture,
          ),
        )
        .toBe(false);

      return page.evaluate(
        () =>
          (window as unknown as { backgroundProbe: { pixels: number[] } }).backgroundProbe.pixels,
      );
    };

    const before = await capture();

    await page.waitForTimeout(3000);
    const after = await capture();
    const difference = after.reduce((sum, value, i) => sum + Math.abs(value - before[i]), 0);

    expect(before.length).toBeGreaterThan(0);
    expect(difference / after.length).toBeGreaterThan(2);
  }
});
