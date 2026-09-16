import type { OptimizedContent } from './types';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o';

export class OpenAIConfigError extends Error {}
export class OpenAIRequestError extends Error {}

interface StoryForOptimization {
  headline: string;
  category?: string | null;
  summary?: string | null;
  body: string;
  authorName?: string | null;
  referenceLink?: string | null;
  targetCountries?: string | null;
  keywords?: string | null;
}

function buildPrompt(story: StoryForOptimization, channelType?: string, instructions?: string) {
  const context = [
    `Headline: ${story.headline}`,
    story.category ? `Category: ${story.category}` : null,
    story.summary ? `Summary: ${story.summary}` : null,
    story.authorName ? `Author: ${story.authorName}` : null,
    story.referenceLink ? `Reference link: ${story.referenceLink}` : null,
    story.targetCountries ? `Target countries: ${story.targetCountries}` : null,
    story.keywords ? `Existing keywords: ${story.keywords}` : null,
    channelType ? `Optimize primarily for this channel type: ${channelType}` : null,
    instructions ? `Additional instructions from the author: ${instructions}` : null,
    '',
    'Full story body:',
    story.body,
  ]
    .filter(Boolean)
    .join('\n');

  return context;
}

const SYSTEM_PROMPT = `You are an editorial assistant helping an independent author prepare one of \
their own already-written stories for distribution to news sites, press-release \
services, source/editor platforms and self-publishing blogs.

You never invent facts, quotes, statistics or sources that are not present in the \
story the author gives you. Your job is packaging and framing existing material, \
not writing new claims. Keep the author's voice; do not add hype the story does \
not support.

Return strict JSON matching this shape and nothing else:
{
  "headlines": string[],       // 3-5 alternate headline options
  "metaDescription": string,   // <= 160 characters
  "keywords": string[],        // 5-10 SEO keywords/phrases
  "hashtags": string[],        // 3-6 hashtags, no leading text
  "pressRelease": string,      // a press-release framing of the same story
  "editorPitch": string        // a short pitch email an editor could read in 30 seconds
}`;

/**
 * Calls OpenAI's chat completions endpoint to produce channel-agnostic
 * optimized content for a story the author already wrote. Server-side
 * only — never import this from a client component.
 */
export async function optimizeStoryContent(
  story: StoryForOptimization,
  opts: { channelType?: string; instructions?: string } = {},
): Promise<OptimizedContent> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIConfigError(
      'OPENAI_API_KEY is not set. Add it to .env.local before generating optimized content.',
    );
  }

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.5,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(story, opts.channelType, opts.instructions) },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new OpenAIRequestError(`OpenAI request failed (${response.status}): ${text.slice(0, 500)}`);
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content;
  if (typeof raw !== 'string') {
    throw new OpenAIRequestError('OpenAI response did not contain message content.');
  }

  return parseOptimizedContent(raw);
}

/** Exported separately so it has its own unit tests without a network call. */
export function parseOptimizedContent(raw: string): OptimizedContent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new OpenAIRequestError('OpenAI response was not valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new OpenAIRequestError('OpenAI response JSON was not an object.');
  }

  const obj = parsed as Record<string, unknown>;
  const headlines = Array.isArray(obj.headlines) ? obj.headlines.filter((h) => typeof h === 'string') : [];
  const keywords = Array.isArray(obj.keywords) ? obj.keywords.filter((k) => typeof k === 'string') : [];
  const hashtags = Array.isArray(obj.hashtags) ? obj.hashtags.filter((h) => typeof h === 'string') : [];

  if (headlines.length === 0) {
    throw new OpenAIRequestError('OpenAI response did not include any headlines.');
  }

  return {
    headlines,
    metaDescription: typeof obj.metaDescription === 'string' ? obj.metaDescription : '',
    keywords,
    hashtags,
    pressRelease: typeof obj.pressRelease === 'string' ? obj.pressRelease : '',
    editorPitch: typeof obj.editorPitch === 'string' ? obj.editorPitch : '',
  };
}
