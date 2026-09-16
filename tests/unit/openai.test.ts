import { describe, expect, it } from 'vitest';
import { OpenAIConfigError, OpenAIRequestError, optimizeStoryContent, parseOptimizedContent } from '../../lib/openai';

describe('parseOptimizedContent', () => {
  it('parses a well-formed OpenAI response', () => {
    const raw = JSON.stringify({
      headlines: ['A', 'B'],
      metaDescription: 'desc',
      keywords: ['a', 'b'],
      hashtags: ['#a'],
      pressRelease: 'PR body',
      editorPitch: 'Pitch',
    });
    const parsed = parseOptimizedContent(raw);
    expect(parsed.headlines).toEqual(['A', 'B']);
    expect(parsed.pressRelease).toBe('PR body');
  });

  it('fills in sensible defaults for missing optional fields', () => {
    const raw = JSON.stringify({ headlines: ['Only headline'] });
    const parsed = parseOptimizedContent(raw);
    expect(parsed.metaDescription).toBe('');
    expect(parsed.keywords).toEqual([]);
    expect(parsed.hashtags).toEqual([]);
  });

  it('throws OpenAIRequestError on invalid JSON', () => {
    expect(() => parseOptimizedContent('not json')).toThrow(OpenAIRequestError);
  });

  it('throws OpenAIRequestError when headlines are missing entirely', () => {
    expect(() => parseOptimizedContent(JSON.stringify({ metaDescription: 'x' }))).toThrow(OpenAIRequestError);
  });

  it('drops non-string entries from array fields rather than crashing', () => {
    const raw = JSON.stringify({ headlines: ['ok', 42, null], keywords: ['k1', {}] });
    const parsed = parseOptimizedContent(raw);
    expect(parsed.headlines).toEqual(['ok']);
    expect(parsed.keywords).toEqual(['k1']);
  });
});

describe('optimizeStoryContent', () => {
  it('throws OpenAIConfigError when OPENAI_API_KEY is not set', async () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      await expect(
        optimizeStoryContent({ headline: 'H', body: 'B' }),
      ).rejects.toThrow(OpenAIConfigError);
    } finally {
      if (original) process.env.OPENAI_API_KEY = original;
    }
  });
});
