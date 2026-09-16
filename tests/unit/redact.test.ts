import { describe, expect, it } from 'vitest';
import { redact } from '../../lib/playwright/redact';

describe('redact', () => {
  it('redacts OpenAI-style API keys', () => {
    expect(redact('key is sk-abcdefghijklmnop')).toBe('key is [redacted]');
  });

  it('redacts password fields', () => {
    expect(redact('password: hunter2')).toBe('[redacted]');
    expect(redact('pwd=hunter2')).toBe('[redacted]');
  });

  it('redacts cookies and session tokens', () => {
    expect(redact('Cookie: sessionid=abc123')).toBe('[redacted]');
    expect(redact('access_token: abc.def.ghi')).toBe('[redacted]');
  });

  it('redacts authorization headers', () => {
    // The "authorization: <token>" alternative consumes both the header
    // name and the scheme word ("Bearer") as part of one match.
    expect(redact('Authorization: Bearer abc123')).toBe('[redacted] abc123');
  });

  it('leaves ordinary text untouched', () => {
    expect(redact('Navigated to https://medium.com/new-story')).toBe('Navigated to https://medium.com/new-story');
  });
});
