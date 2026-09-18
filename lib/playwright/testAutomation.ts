import { prisma } from '../db';
import { launchEphemeralContext, launchProfileContext, closeContext } from './browser';
import { captureScreenshot } from './screenshots';
import { assertAllowedNavigation } from '../automation/domainRestriction';

export interface FieldCheck {
  field: string;
  selector: string;
  found: boolean;
}

export interface DiscoveredField {
  tag: string;
  type: string;
  id: string;
  name: string;
  placeholder: string;
}

export interface TestAutomationReport {
  navigated: boolean;
  fields: FieldCheck[];
  submitSelectorFound: boolean | null;
  screenshotPath: string | null;
  error: string | null;
  /**
   * Every input/textarea/select/button actually present on the page,
   * regardless of what's configured — lets a first-time mapping start
   * from what's really there instead of guessing selectors blind. Most
   * useful together with usedLoggedInSession for a login-gated channel.
   */
  discoveredFields: DiscoveredField[];
  /** True when this run reused the channel's saved, logged-in session rather than an anonymous throwaway browser. */
  usedLoggedInSession: boolean;
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
    include: { automationProfile: true, browserProfile: true },
  });
  const profile = channel.automationProfile;
  if (!profile) {
    return {
      navigated: false,
      fields: [],
      submitSelectorFound: null,
      screenshotPath: null,
      error: 'No automation profile configured yet for this channel.',
      discoveredFields: [],
      usedLoggedInSession: false,
    };
  }

  // Reuse the channel's saved, logged-in session when one exists, so a
  // login-gated channel's *real* submission form can be inspected —
  // an anonymous throwaway browser would only ever see the login wall.
  // Submit is still never clicked either way (section 23's safe test mode).
  const usedLoggedInSession = channel.loginRequired && channel.browserProfile?.status === 'logged_in';
  const context = usedLoggedInSession
    ? await launchProfileContext(channel.browserProfile!.profileDir)
    : await launchEphemeralContext();
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

    const discoveredFields = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input,textarea,select,button')).map((el) => ({
        tag: el.tagName,
        type: (el as HTMLInputElement).type || el.tagName.toLowerCase(),
        id: el.id || '',
        name: (el as HTMLInputElement).name || '',
        placeholder: (el as HTMLInputElement).placeholder || '',
      })),
    );

    const screenshotPath = await captureScreenshot(page, `test-${channelId}`, 'form_loaded');

    await prisma.channel.update({ where: { id: channelId }, data: { lastTestedAt: new Date() } });

    return { navigated: true, fields, submitSelectorFound, screenshotPath, error: null, discoveredFields, usedLoggedInSession };
  } catch (err) {
    return {
      navigated: false,
      fields: [],
      submitSelectorFound: null,
      screenshotPath: null,
      error: err instanceof Error ? err.message : String(err),
      discoveredFields: [],
      usedLoggedInSession,
    };
  } finally {
    await closeContext(context);
  }
}
