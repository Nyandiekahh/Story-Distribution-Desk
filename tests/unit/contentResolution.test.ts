import { describe, expect, it } from 'vitest';
import { applyContentOverride, parseContentOverride, resolveChannelContent } from '../../lib/automation/contentResolution';

const story = {
  headline: 'Solar hits Kisumu',
  summary: 'A one-line summary.',
  body: 'The full story body.',
  referenceLink: 'https://example.com/source',
  authorName: 'Nyandieka',
  category: 'Energy',
  tags: 'solar, kenya',
};

describe('resolveChannelContent (section 13 / fillForm share this)', () => {
  it('falls back to the raw story when there is no saved version', () => {
    const content = resolveChannelContent(story, null, 'textarea');
    expect(content.title).toBe('Solar hits Kisumu');
    expect(content.body).toBe('The full story body.');
    expect(content.subtitle).toBe('A one-line summary.');
    expect(content.tags).toBe('solar, kenya');
  });

  it('prefers the saved version’s first headline and press release body', () => {
    const version = { headlines: JSON.stringify(['AI headline one', 'AI headline two']), pressRelease: 'AI-optimized press release text.' };
    const content = resolveChannelContent(story, version, 'textarea');
    expect(content.title).toBe('AI headline one');
    expect(content.body).toBe('AI-optimized press release text.');
  });

  it('never uses the press release body for a markdown editor', () => {
    const version = { headlines: JSON.stringify(['AI headline']), pressRelease: 'AI press release.' };
    const content = resolveChannelContent(story, version, 'markdown');
    expect(content.body).toBe('The full story body.');
  });

  it('falls back to the story headline if the version has no headlines', () => {
    const version = { headlines: JSON.stringify([]), pressRelease: null };
    const content = resolveChannelContent(story, version, 'textarea');
    expect(content.title).toBe('Solar hits Kisumu');
  });
});

describe('applyContentOverride', () => {
  const base = resolveChannelContent(story, null, 'textarea');

  it('returns the base content unchanged when there is no override', () => {
    expect(applyContentOverride(base, null)).toEqual(base);
  });

  it('only overrides the fields the user actually edited', () => {
    const result = applyContentOverride(base, { title: 'Edited title' });
    expect(result.title).toBe('Edited title');
    expect(result.body).toBe(base.body);
    expect(result.tags).toBe(base.tags);
  });
});

describe('parseContentOverride', () => {
  it('returns null for missing or invalid JSON', () => {
    expect(parseContentOverride(null)).toBeNull();
    expect(parseContentOverride(undefined)).toBeNull();
    expect(parseContentOverride('{not json')).toBeNull();
  });

  it('parses a stored override back out', () => {
    expect(parseContentOverride(JSON.stringify({ title: 'X' }))).toEqual({ title: 'X' });
  });
});
