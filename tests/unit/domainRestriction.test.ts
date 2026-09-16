import { describe, expect, it } from 'vitest';
import { allowedDomainsForChannel, assertAllowedNavigation, DisallowedNavigationError } from '../../lib/automation/domainRestriction';

describe('domain restriction (section 29)', () => {
  const channel = { name: 'Medium', website: 'https://medium.com', submissionUrl: 'https://medium.com/new-story' };

  it('allows navigation to the channel’s own website and submission URL', () => {
    expect(() => assertAllowedNavigation('https://medium.com/new-story', channel)).not.toThrow();
    expect(() => assertAllowedNavigation('https://medium.com/', channel)).not.toThrow();
  });

  it('allows a subdomain of the registered domain', () => {
    expect(() => assertAllowedNavigation('https://app.medium.com/submit', channel)).not.toThrow();
  });

  it('refuses navigation to an unrelated domain', () => {
    expect(() => assertAllowedNavigation('https://evil-tracker.example/steal', channel)).toThrow(DisallowedNavigationError);
  });

  it('refuses a non-URL target', () => {
    expect(() => assertAllowedNavigation('not a url', channel)).toThrow(DisallowedNavigationError);
  });

  it('does not block navigation for a channel with no registered domain at all', () => {
    expect(() => assertAllowedNavigation('https://anything.example', { name: 'Blank', website: '', submissionUrl: null })).not.toThrow();
  });

  it('collects unique registrable domains from website and submissionUrl', () => {
    const domains = allowedDomainsForChannel({ website: 'https://www.example.com', submissionUrl: 'https://sub.example.com/submit' });
    expect(domains).toEqual(['example.com']);
  });
});
