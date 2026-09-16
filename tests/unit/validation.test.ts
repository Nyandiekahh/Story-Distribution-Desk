import { describe, expect, it } from 'vitest';
import {
  automationProfileInputSchema,
  campaignInputSchema,
  channelInputSchema,
  storyInputSchema,
} from '../../lib/validation';

describe('storyInputSchema', () => {
  it('accepts a minimal valid story', () => {
    const result = storyInputSchema.safeParse({ headline: 'Solar hits Kisumu', body: 'Full text here.' });
    expect(result.success).toBe(true);
  });

  it('rejects a story with no headline', () => {
    const result = storyInputSchema.safeParse({ headline: '', body: 'Full text here.' });
    expect(result.success).toBe(false);
  });

  it('rejects a story with no body', () => {
    const result = storyInputSchema.safeParse({ headline: 'Headline' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid reference link', () => {
    const result = storyInputSchema.safeParse({ headline: 'H', body: 'B', referenceLink: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('allows an empty-string reference link (cleared field)', () => {
    const result = storyInputSchema.safeParse({ headline: 'H', body: 'B', referenceLink: '' });
    expect(result.success).toBe(true);
  });
});

describe('channelInputSchema', () => {
  it('applies defaults for a minimal channel', () => {
    const result = channelInputSchema.parse({ name: 'Medium', website: 'https://medium.com' });
    expect(result.channelType).toBe('other');
    expect(result.automationStatus).toBe('needs_configuration');
    expect(result.isFree).toBe(true);
  });

  it('rejects an unknown channel type', () => {
    const result = channelInputSchema.safeParse({ name: 'X', website: 'https://x.com', channelType: 'not-a-type' });
    expect(result.success).toBe(false);
  });

  it('rejects a channel with no name', () => {
    const result = channelInputSchema.safeParse({ name: '', website: 'https://x.com' });
    expect(result.success).toBe(false);
  });
});

describe('automationProfileInputSchema', () => {
  it('requires a submission URL', () => {
    const result = automationProfileInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('defaults requiresManualReview to true (Assisted-by-default safety)', () => {
    const result = automationProfileInputSchema.parse({ submissionUrl: 'https://example.com/submit' });
    expect(result.requiresManualReview).toBe(true);
  });

  it('rejects an unknown editor type', () => {
    const result = automationProfileInputSchema.safeParse({
      submissionUrl: 'https://example.com/submit',
      editorType: 'wysiwyg-magic',
    });
    expect(result.success).toBe(false);
  });
});

describe('campaignInputSchema', () => {
  it('requires at least one channel', () => {
    const result = campaignInputSchema.safeParse({ name: 'Launch', storyId: 's1', channelIds: [] });
    expect(result.success).toBe(false);
  });

  it('accepts a valid campaign and defaults concurrency', () => {
    const result = campaignInputSchema.parse({ name: 'Launch', storyId: 's1', channelIds: ['c1', 'c2'] });
    expect(result.maxConcurrentJobs).toBe(2);
    expect(result.minDelayMinutes).toBe(5);
  });
});
