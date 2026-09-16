// Shared "enum" values for the app. SQLite has no native enum type, so
// every status/mode/type column in prisma/schema.prisma is a plain
// string — this file is the single source of truth for which strings
// are legal, and every API route validates against it before writing.

export const CHANNEL_TYPES = [
  'press_release',
  'editor_source',
  'self_publishing',
  'social_community',
  'news_community',
  'blog',
  'other',
] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  press_release: 'Press release',
  editor_source: 'Editor / source platform',
  self_publishing: 'Self-publishing',
  social_community: 'Social / community',
  news_community: 'News / community',
  blog: 'Blog',
  other: 'Other',
};

export const AUTOMATION_STATUSES = [
  'manual_only',
  'partially_automated',
  'automated',
  'needs_configuration',
  'disabled',
] as const;
export type AutomationStatus = (typeof AUTOMATION_STATUSES)[number];

export const AUTOMATION_STATUS_LABELS: Record<AutomationStatus, string> = {
  manual_only: 'Manual Only',
  partially_automated: 'Partially Automated',
  automated: 'Automated',
  needs_configuration: 'Needs Configuration',
  disabled: 'Disabled',
};

export const AUTOMATION_SUPPORT_LEVELS = [
  'can_automate',
  'can_partially_automate',
  'requires_human',
  'unknown',
] as const;
export type AutomationSupportLevel = (typeof AUTOMATION_SUPPORT_LEVELS)[number];

export const AUTOMATION_SUPPORT_LABELS: Record<AutomationSupportLevel, string> = {
  can_automate: 'Can automate',
  can_partially_automate: 'Can partially automate',
  requires_human: 'Requires human interaction',
  unknown: 'Unknown',
};

export const EDITOR_TYPES = ['textarea', 'input', 'contenteditable', 'iframe', 'markdown'] as const;
export type EditorType = (typeof EDITOR_TYPES)[number];

// A channel is only allowed to move to "automated" once its profile has
// been configured AND successfully test-run. Nothing in the app should
// flip this switch on its own — see lib/automation/guardrails.ts.
export const AUTOMATION_MODES = ['manual', 'assisted', 'automated'] as const;
export type AutomationMode = (typeof AUTOMATION_MODES)[number];

export const AUTOMATION_MODE_LABELS: Record<AutomationMode, string> = {
  manual: 'Manual',
  assisted: 'Assisted',
  automated: 'Automated',
};

export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'running', 'completed', 'cancelled'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_CHANNEL_STATUSES = [
  'to_do',
  'queued',
  'in_progress',
  'waiting_for_user',
  'submitted',
  'published',
  'failed',
  'skipped',
] as const;
export type CampaignChannelStatus = (typeof CAMPAIGN_CHANNEL_STATUSES)[number];

export const CAMPAIGN_CHANNEL_STATUS_LABELS: Record<CampaignChannelStatus, string> = {
  to_do: 'To Do',
  queued: 'Queued',
  in_progress: 'In Progress',
  waiting_for_user: 'Waiting for User',
  submitted: 'Submitted',
  published: 'Published',
  failed: 'Failed',
  skipped: 'Skipped',
};

export const JOB_STATUSES = [
  'queued',
  'paused',
  'starting',
  'navigating',
  'filling',
  'waiting_for_user',
  'submitting',
  'success',
  'failed',
  'cancelled',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  queued: 'Queued',
  paused: 'Paused',
  starting: 'Starting',
  navigating: 'Navigating',
  filling: 'Filling',
  waiting_for_user: 'Waiting for User',
  submitting: 'Submitting',
  success: 'Success',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

// Manual-intervention reasons that aren't one of CHECKPOINT_REASONS below
// (those are specifically things automation refuses to work around). A
// job can also stop and wait on the user because of Mode A (manual_mode),
// an Assisted-mode review stop (ready_for_review), or a user-requested
// Pause (paused_by_user, section 33) — this is the display copy for those.
export const OTHER_WAIT_REASON_LABELS: Record<string, string> = {
  manual_mode: 'Manual mode — complete the submission yourself',
  ready_for_review: 'Ready for review — submit it yourself, then press Continue',
  paused_by_user: 'Paused — press Resume to continue, or Cancel to stop this job',
};

// Job statuses that mean "the browser worker owns this job and it is
// not safe to start a second worker on the same job."
export const ACTIVE_JOB_STATUSES: JobStatus[] = [
  'starting',
  'navigating',
  'filling',
  'waiting_for_user',
  'submitting',
];

export const BROWSER_PROFILE_STATUSES = ['not_configured', 'logged_in', 'expired'] as const;
export type BrowserProfileStatus = (typeof BROWSER_PROFILE_STATUSES)[number];

export const BROWSER_PROFILE_STATUS_LABELS: Record<BrowserProfileStatus, string> = {
  not_configured: 'Not configured',
  logged_in: 'Logged-in session available',
  expired: 'Session expired',
};

export const ATTEMPT_RESULTS = ['success', 'failure', 'info'] as const;
export type AttemptResult = (typeof ATTEMPT_RESULTS)[number];

// Reasons an automation run stops and hands control back to the user.
// These are all things we deliberately refuse to work around.
export const CHECKPOINT_REASONS = [
  'captcha',
  '2fa',
  'suspicious_login_verification',
  'email_verification',
  'unexpected_modal',
  'editorial_question',
  'terms_confirmation',
  'website_redesign',
  'selector_failure',
  'failed_navigation',
  'account_suspension',
  'content_warning',
] as const;
export type CheckpointReason = (typeof CHECKPOINT_REASONS)[number];

export const CHECKPOINT_REASON_LABELS: Record<CheckpointReason, string> = {
  captcha: 'CAPTCHA detected',
  '2fa': 'Two-factor authentication required',
  suspicious_login_verification: 'Suspicious login verification',
  email_verification: 'Email verification required',
  unexpected_modal: 'Unexpected dialog on the page',
  editorial_question: 'Editorial question needs a human answer',
  terms_confirmation: 'Terms/guidelines confirmation required',
  website_redesign: 'Website layout has changed',
  selector_failure: 'A configured selector could not be found',
  failed_navigation: 'Navigation failed',
  account_suspension: 'Account appears suspended or blocked',
  content_warning: 'Site flagged the content for review',
};

// The logical content fields a channel's automation profile can map to
// a CSS selector. See lib/automation/fieldMapping.ts.
export const LOGICAL_FIELDS = [
  'title',
  'subtitle',
  'summary',
  'body',
  'tags',
  'category',
  'author',
  'referenceLink',
  'image',
  'canonicalUrl',
] as const;
export type LogicalField = (typeof LOGICAL_FIELDS)[number];

// What the user edited in the Submission Preview (section 13) for one
// channel, before anything was queued. Every field is optional — an
// unset field just means "use the story's own value," resolved by
// lib/automation/contentResolution.ts.
export interface ContentOverride {
  title?: string;
  subtitle?: string;
  summary?: string;
  body?: string;
  tags?: string;
  referenceLink?: string;
}

export interface OptimizedContent {
  headlines: string[];
  metaDescription: string;
  keywords: string[];
  hashtags: string[];
  pressRelease: string;
  editorPitch: string;
}

export function csvToList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function listToCsv(values: string[] | undefined | null): string {
  if (!values || values.length === 0) return '';
  return values.map((v) => v.trim()).filter(Boolean).join(', ');
}
