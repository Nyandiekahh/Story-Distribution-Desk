import { defineConfig } from '@playwright/test';
import fs from 'node:fs';

// Only a handful of sandboxed CI-style environments pin Chromium at a
// fixed path outside Playwright's own managed browser cache. Everywhere
// else (including a normal `npx playwright install chromium` on your
// own machine) this resolves to nothing and Playwright picks its usual
// managed browser automatically.
const pinnedChromium = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath = fs.existsSync(pinnedChromium) ? pinnedChromium : undefined;

/**
 * Configuration for the app's own test suite (tests/e2e), which drives
 * the reusable field-fill helpers in lib/playwright/actions.ts against
 * the local mock pages in tests/e2e/fixtures — never a live channel.
 * This is separate from the app's own automation, which always launches
 * a visible, persistent-context Chromium (see lib/playwright/browser.ts).
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    headless: true,
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
});
