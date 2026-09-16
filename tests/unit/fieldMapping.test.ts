import { describe, expect, it } from 'vitest';
import { parseFieldMapping, serializeFieldMapping } from '../../lib/automation/fieldMapping';

describe('parseFieldMapping', () => {
  it('returns an empty mapping for null/undefined/blank input', () => {
    expect(parseFieldMapping(null)).toEqual({});
    expect(parseFieldMapping(undefined)).toEqual({});
    expect(parseFieldMapping('')).toEqual({});
  });

  it('returns an empty mapping for invalid JSON rather than throwing', () => {
    expect(parseFieldMapping('{not json')).toEqual({});
  });

  it('only keeps known logical fields', () => {
    const json = JSON.stringify({ canonicalUrl: '#link', notAField: '#nope', title: 42 });
    expect(parseFieldMapping(json)).toEqual({ canonicalUrl: '#link' });
  });

  it('round-trips through serializeFieldMapping', () => {
    const mapping = { canonicalUrl: '#link', author: '.byline' };
    const round = parseFieldMapping(serializeFieldMapping(mapping));
    expect(round).toEqual(mapping);
  });
});
