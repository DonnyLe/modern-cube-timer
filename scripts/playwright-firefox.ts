import { firefox, type LaunchOptions } from '@playwright/test';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

export function firefoxLaunchOptions(): LaunchOptions {
  if (process.platform !== 'darwin') return {};

  // macOS 27 protects the regular Firefox app-data directory. Give the test
  // browser its own identity without changing the installed browser or profile.
  // https://github.com/microsoft/playwright/issues/42768
  const resources = resolve(dirname(firefox.executablePath()), '../Resources');
  // Allow listing tests before the browser has been installed.
  if (!existsSync(join(resources, 'application.ini'))) return {};
  const directory = mkdtempSync(join(tmpdir(), 'turn-playwright-firefox-'));
  const application = join(directory, 'application.ini');
  const ini = readFileSync(join(resources, 'application.ini'), 'utf8')
    .replace(/^Vendor=.*$/m, 'Vendor=Playwright')
    .replace(/^Name=.*$/m, 'Name=PlaywrightFirefox');
  writeFileSync(application, ini);
  for (const entry of readdirSync(join(resources, 'browser'))) {
    if (entry !== 'application.ini')
      symlinkSync(join(resources, 'browser', entry), join(directory, entry));
  }
  process.once('exit', () => rmSync(directory, { recursive: true, force: true }));
  return { env: { ...process.env, XUL_APP_FILE: application } };
}
