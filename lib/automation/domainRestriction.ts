// Section 29: "Restrict Playwright navigation to configured channel
// domains where practical." A channel's automation profile stores a
// submissionUrl that a person typed into the Channel Configuration UI —
// this is the one place we sanity-check that value (and the channel's
// own submissionUrl/website) actually point at the same site before a
// real, authenticated browser context is pointed at it. This is a
// registrable-domain check, not a full public-suffix-list parser — good
// enough to catch a typo'd or substituted URL, not a defense against a
// deliberately malicious channel record.

export class DisallowedNavigationError extends Error {}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Last two labels of a hostname — "app.medium.com" and "medium.com" both become "medium.com". Not PSL-aware (a ".co.uk" site is treated as two labels), which only makes this check stricter than it needs to be for those domains, never looser. */
function registrableDomain(hostname: string): string {
  const parts = hostname.split('.');
  return parts.length <= 2 ? hostname : parts.slice(-2).join('.');
}

export function allowedDomainsForChannel(channel: { website: string; submissionUrl?: string | null }): string[] {
  const domains = new Set<string>();
  for (const url of [channel.website, channel.submissionUrl]) {
    if (!url) continue;
    const host = hostnameOf(url);
    if (host) domains.add(registrableDomain(host));
  }
  return Array.from(domains);
}

/**
 * Throws if `targetUrl` doesn't resolve to the same registrable domain
 * as the channel's own website/submissionUrl. Called right before every
 * `page.goto()` that uses a stored, user-editable URL (an automation
 * profile's submissionUrl) rather than a value we just navigated
 * ourselves — see channelRunner.ts and testAutomation.ts.
 */
export function assertAllowedNavigation(targetUrl: string, channel: { name: string; website: string; submissionUrl?: string | null }): void {
  const allowed = allowedDomainsForChannel(channel);
  if (allowed.length === 0) {
    // The channel has no registered domain to check against at all —
    // nothing to compare, so there's nothing to block.
    return;
  }
  const targetHost = hostnameOf(targetUrl);
  if (!targetHost) {
    throw new DisallowedNavigationError(`"${targetUrl}" is not a navigable URL for ${channel.name}.`);
  }
  const targetDomain = registrableDomain(targetHost);
  if (!allowed.includes(targetDomain)) {
    throw new DisallowedNavigationError(
      `Refusing to navigate to ${targetUrl} — it doesn't match ${channel.name}'s registered domain (${allowed.join(', ')}). Fix the channel's website or the automation profile's Submission URL if this is a mistake.`,
    );
  }
}
