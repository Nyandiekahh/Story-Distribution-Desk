import { describe, expect, it } from 'vitest';
import { csvToList, listToCsv } from '../../lib/types';

describe('csvToList / listToCsv', () => {
  it('round-trips a normal list', () => {
    const csv = listToCsv(['Kenya', 'Nigeria', 'Ghana']);
    expect(csv).toBe('Kenya, Nigeria, Ghana');
    expect(csvToList(csv)).toEqual(['Kenya', 'Nigeria', 'Ghana']);
  });

  it('trims whitespace and drops empty entries', () => {
    expect(csvToList('a,  b ,,c')).toEqual(['a', 'b', 'c']);
  });

  it('handles null/undefined/empty input', () => {
    expect(csvToList(null)).toEqual([]);
    expect(csvToList(undefined)).toEqual([]);
    expect(csvToList('')).toEqual([]);
    expect(listToCsv(undefined)).toBe('');
    expect(listToCsv([])).toBe('');
  });
});
