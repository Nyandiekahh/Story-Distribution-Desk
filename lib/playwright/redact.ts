/**
 * Split out from logs.ts so it can be unit tested without pulling in
 * the Prisma client (see section 21 — never log passwords, cookies,
 * session tokens, auth headers or API keys).
 */
const SECRET_PATTERNS: RegExp[] = [
  /sk-[a-zA-Z0-9]{10,}/g, // OpenAI-style API keys
  /(authorization|bearer)\s*[:=]\s*\S+/gi,
  /(password|passwd|pwd)\s*[:=]\s*\S+/gi,
  /(cookie|set-cookie)\s*[:=]\s*\S+/gi,
  /(session[_-]?token|access[_-]?token|refresh[_-]?token)\s*[:=]\s*\S+/gi,
];

export function redact(input: string): string {
  let out = input;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, '[redacted]');
  }
  return out;
}
