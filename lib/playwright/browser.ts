import { chromium, type BrowserContext, type Page } from 'playwright';
import { ensureProfilesRoot, resolveProfilePath } from './profiles';

/**
 * Every browser we open is a persistent context tied to a profile
 * directory, so a channel that needs a login only ever needs it once
 * (see the "Setup Login" flow). We always launch visibly — this tool is
 * meant to be watched, and headless automation against a site that
 * hasn't explicitly approved it is exactly the kind of "uncontrolled
 * spam bot" behaviour the spec rules out.
 */
export async function launchProfileContext(profileDir: string): Promise<BrowserContext> {
  await ensureProfilesRoot();
  const userDataDir = resolveProfilePath(profileDir);
  return chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
}

/**
 * A short-lived, non-persistent visible browser for "Test Automation" —
 * we deliberately do not reuse or write to the real profile here so a
 * test run can never accidentally submit anything.
 */
export async function launchEphemeralContext(): Promise<BrowserContext> {
  const browser = await chromium.launch({ headless: false });
  return browser.newContext({ viewport: { width: 1280, height: 900 } });
}

export async function firstPage(context: BrowserContext): Promise<Page> {
  const pages = context.pages();
  return pages[0] ?? context.newPage();
}

export async function closeContext(context: BrowserContext | null | undefined) {
  if (!context) return;
  const browser = context.browser();
  try {
    await context.close();
  } catch {
    // The window may already have been closed by the user — that's fine.
  }
  // launchPersistentContext has no separate Browser to close. An
  // ephemeral (Test Automation) context does, and leaves a bare
  // Chromium process behind if we don't close it too.
  if (browser) {
    try {
      await browser.close();
    } catch {
      // already gone
    }
  }
}
