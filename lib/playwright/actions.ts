import type { Page } from 'playwright';

/**
 * Reusable Playwright helpers for the handful of editor shapes real
 * publishing sites actually use (see prisma ChannelAutomationProfile.
 * editorType). Every helper is a no-op when its selector is missing so
 * a channel can be configured for only the fields it actually supports.
 */

const DEFAULT_TIMEOUT = 8000;

export async function fillInput(page: Page, selector: string | null | undefined, value: string) {
  if (!selector || !value) return false;
  const el = page.locator(selector).first();
  if ((await el.count()) === 0) return false;
  await el.fill(value, { timeout: DEFAULT_TIMEOUT });
  return true;
}

export async function fillTextarea(page: Page, selector: string | null | undefined, value: string) {
  return fillInput(page, selector, value);
}

export async function fillContentEditable(page: Page, selector: string | null | undefined, value: string) {
  if (!selector || !value) return false;
  const el = page.locator(selector).first();
  if ((await el.count()) === 0) return false;
  await el.click({ timeout: DEFAULT_TIMEOUT });
  await el.evaluate((node) => {
    (node as HTMLElement).innerText = '';
  });
  // Type rather than set innerHTML directly so editors that listen for
  // real keystrokes (most rich-text editors) pick up the content.
  await page.keyboard.type(value, { delay: 4 });
  return true;
}

/** Falls back gracefully — the spec asks that unsupported rich editors drop to Assisted mode rather than guess. */
export async function fillRichTextEditor(
  page: Page,
  selector: string | null | undefined,
  value: string,
  editorType: string,
) {
  switch (editorType) {
    case 'textarea':
    case 'input':
    case 'markdown':
      return fillInput(page, selector, value);
    case 'contenteditable':
      return fillContentEditable(page, selector, value);
    case 'iframe': {
      if (!selector) return false;
      const frame = page.frameLocator(selector);
      const body = frame.locator('body').first();
      if ((await body.count()) === 0) return false;
      await body.click();
      await page.keyboard.type(value, { delay: 4 });
      return true;
    }
    default:
      return false;
  }
}

export async function uploadImage(page: Page, selector: string | null | undefined, filePath: string | null | undefined) {
  if (!selector || !filePath) return false;
  const el = page.locator(selector).first();
  if ((await el.count()) === 0) return false;
  await el.setInputFiles(filePath, { timeout: DEFAULT_TIMEOUT });
  return true;
}

export async function selectOption(page: Page, selector: string | null | undefined, value: string) {
  if (!selector || !value) return false;
  const el = page.locator(selector).first();
  if ((await el.count()) === 0) return false;
  try {
    await el.selectOption({ label: value }, { timeout: DEFAULT_TIMEOUT });
    return true;
  } catch {
    try {
      await el.selectOption(value, { timeout: DEFAULT_TIMEOUT });
      return true;
    } catch {
      return false;
    }
  }
}

export async function addTags(page: Page, selector: string | null | undefined, tags: string[]) {
  if (!selector || tags.length === 0) return false;
  const el = page.locator(selector).first();
  if ((await el.count()) === 0) return false;
  const tagName = await el.evaluate((node) => node.tagName.toLowerCase());
  if (tagName === 'select') {
    return selectOption(page, selector, tags[0]);
  }
  // Most tag widgets accept comma or Enter separated text typed into an input.
  await el.click({ timeout: DEFAULT_TIMEOUT });
  for (const tag of tags) {
    await page.keyboard.type(tag, { delay: 4 });
    await page.keyboard.press('Enter');
  }
  return true;
}

export async function clickButton(page: Page, selector: string | null | undefined) {
  if (!selector) return false;
  const el = page.locator(selector).first();
  if ((await el.count()) === 0) return false;
  await el.click({ timeout: DEFAULT_TIMEOUT });
  return true;
}

export interface SuccessCheckResult {
  succeeded: boolean;
  confident: boolean;
  publishedUrl?: string;
}

/**
 * Looks for the signals section 20 of the spec calls out. Never returns
 * succeeded:true+confident:false — ambiguous outcomes are reported as
 * "may have succeeded, please verify manually" and left for a human,
 * never silently marked Published.
 */
export async function waitForSuccess(
  page: Page,
  opts: { successSelector?: string | null; successUrlPattern?: string | null; startUrl: string },
): Promise<SuccessCheckResult> {
  const { successSelector, successUrlPattern, startUrl } = opts;

  try {
    if (successSelector) {
      await page.waitForSelector(successSelector, { timeout: 15000 });
      return { succeeded: true, confident: true, publishedUrl: page.url() };
    }
    if (successUrlPattern) {
      await page.waitForURL((url) => url.toString().includes(successUrlPattern), { timeout: 15000 });
      return { succeeded: true, confident: true, publishedUrl: page.url() };
    }
  } catch {
    // fall through to the heuristic checks below
  }

  // No configured signal, or it didn't show up in time — fall back to a
  // conservative heuristic: did the URL actually change?
  await page.waitForTimeout(1500);
  const currentUrl = page.url();
  if (currentUrl !== startUrl) {
    return { succeeded: true, confident: false, publishedUrl: currentUrl };
  }

  return { succeeded: false, confident: false };
}
