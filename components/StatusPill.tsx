const TONE_CLASSES: Record<string, string> = {
  good: 'bg-goodSoft text-good',
  warn: 'bg-warnSoft text-warn',
  bad: 'bg-badSoft text-bad',
  neutral: 'bg-ink/[0.06] text-ink/70',
  accent: 'bg-accentSoft text-accent',
};

const STATUS_TONE: Record<string, keyof typeof TONE_CLASSES> = {
  // campaign channel / job statuses
  to_do: 'neutral',
  queued: 'neutral',
  paused: 'warn',
  in_progress: 'accent',
  starting: 'accent',
  navigating: 'accent',
  filling: 'accent',
  submitting: 'accent',
  waiting_for_user: 'warn',
  submitted: 'accent',
  published: 'good',
  success: 'good',
  failed: 'bad',
  skipped: 'neutral',
  cancelled: 'neutral',
  // automation status
  manual_only: 'neutral',
  partially_automated: 'warn',
  automated: 'good',
  needs_configuration: 'warn',
  disabled: 'bad',
  // browser profile
  not_configured: 'neutral',
  logged_in: 'good',
  expired: 'warn',
  // campaign status
  draft: 'neutral',
  scheduled: 'accent',
  running: 'accent',
  completed: 'good',
};

const LABEL_OVERRIDES: Record<string, string> = {
  to_do: 'To Do',
  in_progress: 'In Progress',
  waiting_for_user: 'Waiting for User',
  needs_configuration: 'Needs Configuration',
  manual_only: 'Manual Only',
  partially_automated: 'Partially Automated',
  not_configured: 'Not configured',
  logged_in: 'Logged in',
};

function humanize(value: string) {
  return LABEL_OVERRIDES[value] ?? value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

export function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'neutral';
  return <span className={`pill ${TONE_CLASSES[tone]}`}>{humanize(status)}</span>;
}
