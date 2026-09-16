import { z } from 'zod';
import {
  AUTOMATION_MODES,
  AUTOMATION_STATUSES,
  AUTOMATION_SUPPORT_LEVELS,
  CHANNEL_TYPES,
  EDITOR_TYPES,
} from './types';

export const storyInputSchema = z.object({
  headline: z.string().min(1, 'Headline is required').max(300),
  category: z.string().max(120).optional().nullable(),
  summary: z.string().max(500).optional().nullable(),
  body: z.string().min(1, 'Body is required'),
  posterPath: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().or(z.literal('')).nullable(),
  referenceLink: z.string().url().optional().or(z.literal('')).nullable(),
  authorName: z.string().max(120).optional().nullable(),
  targetCountries: z.string().max(500).optional().nullable(),
  targetRegions: z.string().max(500).optional().nullable(),
  keywords: z.string().max(500).optional().nullable(),
  tags: z.string().max(500).optional().nullable(),
});
export type StoryInput = z.infer<typeof storyInputSchema>;

export const channelInputSchema = z.object({
  name: z.string().min(1).max(160),
  website: z.string().min(1).max(500),
  submissionUrl: z.string().max(500).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  region: z.string().max(120).optional().nullable(),
  channelType: z.enum(CHANNEL_TYPES).default('other'),
  description: z.string().max(1000).optional().nullable(),
  isFree: z.boolean().default(true),
  requiresAccount: z.boolean().default(false),
  loginRequired: z.boolean().default(false),
  automationStatus: z.enum(AUTOMATION_STATUSES).default('needs_configuration'),
  automationSupportLevel: z.enum(AUTOMATION_SUPPORT_LEVELS).default('unknown'),
  enabled: z.boolean().default(true),
  notes: z.string().max(2000).optional().nullable(),
});
export type ChannelInput = z.infer<typeof channelInputSchema>;

export const automationProfileInputSchema = z.object({
  enabled: z.boolean().default(false),
  loginRequired: z.boolean().default(false),
  submissionUrl: z.string().min(1, 'Submission URL is required'),
  editorType: z.enum(EDITOR_TYPES).default('textarea'),
  titleSelector: z.string().max(300).optional().nullable(),
  subtitleSelector: z.string().max(300).optional().nullable(),
  summarySelector: z.string().max(300).optional().nullable(),
  bodySelector: z.string().max(300).optional().nullable(),
  tagsSelector: z.string().max(300).optional().nullable(),
  categorySelector: z.string().max(300).optional().nullable(),
  imageSelector: z.string().max(300).optional().nullable(),
  linkSelector: z.string().max(300).optional().nullable(),
  authorSelector: z.string().max(300).optional().nullable(),
  submitSelector: z.string().max(300).optional().nullable(),
  successSelector: z.string().max(300).optional().nullable(),
  successUrlPattern: z.string().max(300).optional().nullable(),
  requiresManualReview: z.boolean().default(true),
  fieldMappingJson: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
export type AutomationProfileInput = z.infer<typeof automationProfileInputSchema>;

// Section 13's Submission Preview: what the user edited for one channel
// before the campaign was queued. Every field optional — an unset field
// just falls back to the story's own value (see contentResolution.ts).
export const contentOverrideSchema = z.object({
  title: z.string().max(300).optional(),
  subtitle: z.string().max(300).optional(),
  summary: z.string().max(500).optional(),
  body: z.string().max(20000).optional(),
  tags: z.string().max(500).optional(),
  referenceLink: z.string().max(500).optional(),
});
export type ContentOverrideInput = z.infer<typeof contentOverrideSchema>;

export const campaignInputSchema = z.object({
  name: z.string().min(1).max(200),
  storyId: z.string().min(1),
  storyVersionId: z.string().optional().nullable(),
  channelIds: z.array(z.string().min(1)).min(1, 'Select at least one channel'),
  scheduledStart: z.string().datetime().optional().nullable(),
  minDelayMinutes: z.number().int().min(0).max(1440).default(5),
  maxConcurrentJobs: z.number().int().min(1).max(10).default(2),
  contentOverrides: z.record(z.string(), contentOverrideSchema).optional(),
});
export type CampaignInput = z.infer<typeof campaignInputSchema>;

export const campaignPreviewRequestSchema = z.object({
  storyId: z.string().min(1),
  storyVersionId: z.string().optional().nullable(),
  channelIds: z.array(z.string().min(1)).min(1, 'Select at least one channel'),
});
export type CampaignPreviewRequest = z.infer<typeof campaignPreviewRequestSchema>;

export const jobCreateSchema = z.object({
  storyId: z.string().min(1),
  storyVersionId: z.string().optional().nullable(),
  channelIds: z.array(z.string().min(1)).min(1),
  mode: z.enum(AUTOMATION_MODES).optional(),
  campaignId: z.string().optional().nullable(),
});
export type JobCreateInput = z.infer<typeof jobCreateSchema>;

export const optimizeRequestSchema = z.object({
  storyId: z.string().min(1),
  channelType: z.enum(CHANNEL_TYPES).optional(),
  instructions: z.string().max(1000).optional(),
});
export type OptimizeRequest = z.infer<typeof optimizeRequestSchema>;

export const settingsInputSchema = z.object({
  concurrencyLimit: z.number().int().min(1).max(10),
  minDelaySeconds: z.number().int().min(0).max(3600),
  maxRetries: z.number().int().min(0).max(5),
  cooldownAfterFailureSec: z.number().int().min(0).max(7200),
});
export type SettingsInput = z.infer<typeof settingsInputSchema>;

/** Small helper so API routes can turn a zod failure into a 400 response body. */
export function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}
