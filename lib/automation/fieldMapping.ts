import { LOGICAL_FIELDS, type LogicalField } from '../types';

export type FieldMapping = Partial<Record<LogicalField, string>>;

/** See spec section 14 — the named selector columns on ChannelAutomationProfile cover the common case; this JSON blob is the escape hatch for a site that needs something else. */
export function parseFieldMapping(json: string | null | undefined): FieldMapping {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const result: FieldMapping = {};
    for (const field of LOGICAL_FIELDS) {
      const value = (parsed as Record<string, unknown>)[field];
      if (typeof value === 'string' && value.trim()) {
        result[field] = value.trim();
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function serializeFieldMapping(mapping: FieldMapping): string {
  return JSON.stringify(mapping);
}
