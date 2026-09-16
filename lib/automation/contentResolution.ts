import type { ContentOverride } from '../types';

export interface ResolvedChannelContent {
  title: string;
  subtitle: string;
  summary: string;
  body: string;
  tags: string;
  referenceLink: string;
  category: string;
  author: string;
}

export interface StoryLike {
  headline: string;
  summary: string | null;
  body: string;
  referenceLink: string | null;
  authorName: string | null;
  category: string | null;
  tags: string | null;
}

export interface StoryVersionLike {
  headlines: string;
  pressRelease: string | null;
}

/**
 * The single place that decides what a channel's submission will
 * actually say, before any override is applied. Section 13's
 * Submission Preview calls this to show the user what would be
 * submitted; channelRunner.ts's fillForm calls it to fill the form —
 * the two are guaranteed to agree because they share this function
 * rather than each re-deriving the content their own way.
 */
export function resolveChannelContent(
  story: StoryLike,
  storyVersion: StoryVersionLike | null | undefined,
  editorType: string | undefined,
): ResolvedChannelContent {
  const title = storyVersion
    ? ((JSON.parse(storyVersion.headlines) as string[])[0] ?? story.headline)
    : story.headline;
  const body = (storyVersion?.pressRelease && editorType !== 'markdown' ? storyVersion.pressRelease : story.body) || story.body;

  return {
    title,
    subtitle: story.summary ?? '',
    summary: story.summary ?? '',
    body,
    tags: story.tags ?? '',
    referenceLink: story.referenceLink ?? '',
    category: story.category ?? '',
    author: story.authorName ?? '',
  };
}

/** Layers a user's Submission Preview edits (if any) on top of the resolved defaults. Only fields the user actually touched are overridden. */
export function applyContentOverride(base: ResolvedChannelContent, override: ContentOverride | null | undefined): ResolvedChannelContent {
  if (!override) return base;
  return {
    ...base,
    title: override.title ?? base.title,
    subtitle: override.subtitle ?? base.subtitle,
    summary: override.summary ?? base.summary,
    body: override.body ?? base.body,
    tags: override.tags ?? base.tags,
    referenceLink: override.referenceLink ?? base.referenceLink,
  };
}

export function parseContentOverride(json: string | null | undefined): ContentOverride | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ContentOverride;
  } catch {
    return null;
  }
}
