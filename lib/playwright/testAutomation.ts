import { prisma } from '../db';
import { launchEphemeralContext, closeContext } from './browser';
import { captureScreenshot } from './screenshots';
import { assertAllowedNavigation } from '../automation/domainRestriction';

export interface FieldCheck {
  field: string;
  selector: string;
  found: boolean;
}

export interface TestAutomationReport {
  navigated: boolean;
  fields: FieldCheck[];
  submitSelectorFound: boolean | null;
  screenshotPath: string | null;
  error: string | null;
}

const NAMED_SELECTOR_FIELDS: Array<[label: string, key: string]> = [
  ['title', 'titleSelector'],
  ['subtitle', 'subtitleSelector'],
  ['summary', 'summarySelector'],
  ['body', 'bodySelector'],
  ['tags', 'tagsSelector'],
  ['category', 'categorySelector'],
  ['image', 'imageSelector'],
  ['reference link', 'linkSelector'],
  ['author', 'authorSelector'],
];

/**
 * Section 23's "safe test mode" — opens a throwaway, non-authenticated
 * browser, checks which configured selectors actually resolve to an
 * element on the page, and closes again. The Submit action is
 * deliberately never invoked here, so this can never publish anything.
 */
export async function testChannelAutomation(channelId: string): Promise<TestAutomationReport> {
  const channel = await prisma.channel.findUniqueOrThrow({
    where: { id: channelId },
    include: { automationProfile: true },
  });
  const profile = channel.automationProfile;
  if (!profile) {
    return {
      navigated: false,
      fields: [],
      submitSelectorFound: null,
      screenshotPath: null,
      error: 'No automation profile configured yet for this channel.',
    };
  }

  const context = await launchEphemeralContext();
  try {
    assertAllowedNavigation(profile.submissionUrl, channel);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(profile.submissionUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const fields: FieldCheck[] = [];
    for (const [label, key] of NAMED_SELECTOR_FIELDS) {
      const selector = (profile as unknown as Record<string, string | null>)[key];
      if (!selector) continue;
      const count = await page.locator(selector).count().catch(() => 0);
      fields.push({ field: label, selector, found: count > 0 });
    }

    let submitSelectorFound: boolean | null = null;
    if (profile.submitSelector) {
      const count = await page.locator(profile.submitSelector).count().catch(() => 0);
      submitSelectorFound = count > 0;
    }

    const screenshotPath = await captureScreenshot(page, `test-${channelId}`, 'form_loaded');

    await prisma.channel.update({ where: { id: channelId }, data: { lastTestedAt: new Date() } });

    return { navigated: true, fields, submitSelectorFound, screenshotPath, error: null };
  } catch (err) {
    return {
      navigated: false,
      fields: [],
      submitSelectorFound: null,
      screenshotPath: null,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await closeContext(context);
  }
}
