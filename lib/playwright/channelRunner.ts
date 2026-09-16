import type { BrowserContext, Page, Response } from 'playwright';
import { prisma } from '../db';
import { csvToList, type CheckpointReason } from '../types';
import { launchProfileContext } from './browser';
import { profileDirNameForChannel } from './profiles';
import {
  addTags,
  clickButton,
  fillInput,
  fillRichTextEditor,
  selectOption,
  uploadImage,
  waitForSuccess,
} from './actions';
import { captureScreenshot } from './screenshots';
import { logAction } from './logs';
import { parseFieldMapping } from '../automation/fieldMapping';
import { applyContentOverride, parseContentOverride, resolveChannelContent, type StoryLike, type StoryVersionLike } from '../automation/contentResolution';
import { assertAllowedNavigation } from '../automation/domainRestriction';

export class ManualModeRequired extends Error {}
export class ChannelNotConfigured extends Error {}
export class LoginRequiredError extends Error {}

/** What the runner asks its caller (lib/jobs/runner.ts) to do when it needs a human. */
export interface RunnerControls {
  isCancelled(): boolean;
  /** Section 33's Pause: true once someone has asked this specific running job to pause. Checked at the same safe checkpoints as blocker detection. */
  isPauseRequested(): boolean;
  /** Consumes the pending pause request once it's been acted on. */
  clearPauseRequested(): void;
  /**
   * Blocks the job until the UI calls continue or cancel on it. The
   * caller is responsible for updating manualInterventionRequired /
   * manualInterventionReason on the job row before awaiting this.
   */
  waitForHuman(reason: string, message: string): Promise<'continue' | 'cancel'>;
}

// Section 9 lists twelve things automation must recognize and hand back
// to a human for rather than work around. Ten of them have a real,
// generic signal we can check for on the page (below); "editorial_question"
// and "website_redesign" don't — the first needs to understand what a
// site is actually asking, the second needs a baseline of the site's
// previous layout to diff against, and neither is something a keyword
// or DOM check can honestly claim to detect. Those two remain something
// only the person watching the visible browser will notice — which is
// the whole point of never running fully unattended in the first place.
const BLOCKER_TEXT_PATTERNS: Array<[CheckpointReason, RegExp]> = [
  ['captcha', /captcha|verify you.?re human|unusual traffic/i],
  ['2fa', /two-factor|\b2fa\b|verification code|enter the code we (sent|texted|emailed)/i],
  ['suspicious_login_verification', /verify it.?s you|confirm your identity|unusual (sign-?in|login) activity|suspicious (sign-?in|login)/i],
  ['email_verification', /verify your email|check your email to (confirm|continue|verify)|email verification/i],
  ['account_suspension', /account (has been )?(suspended|disabled|locked|restricted)|temporarily (locked|suspended)/i],
  ['terms_confirmation', /agree to (the )?terms|accept the (terms|guidelines)|community guidelines/i],
  ['content_warning', /flagged for review|violates our (guidelines|policies|community standards)|content (is )?under review/i],
];

/**
 * A conservative, honest check for things we are not going to try to
 * get past — see the comment on BLOCKER_TEXT_PATTERNS above for which
 * of section 9's twelve reasons this can and can't actually detect. We
 * only ever report what we find — never attempt to solve or route
 * around it.
 */
async function detectBlocker(page: Page): Promise<CheckpointReason | null> {
  const frames = page.frames();
  for (const frame of frames) {
    const url = frame.url();
    if (/recaptcha|hcaptcha|captcha/i.test(url)) return 'captcha';
  }

  const dialogLocator = page.locator('[role="dialog"], [role="alertdialog"]');
  const dialogCount = await dialogLocator.count().catch(() => 0);
  if (dialogCount > 0) {
    const dialogText = await dialogLocator.first().innerText({ timeout: 2000 }).catch(() => '');
    for (const [reason, pattern] of BLOCKER_TEXT_PATTERNS) {
      if (pattern.test(dialogText)) return reason;
    }
    return 'unexpected_modal';
  }

  const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
  for (const [reason, pattern] of BLOCKER_TEXT_PATTERNS) {
    if (pattern.test(bodyText)) return reason;
  }
  return null;
}

async function updateJob(jobId: string, data: Record<string, unknown>) {
  return prisma.submissionJob.update({ where: { id: jobId }, data });
}

async function syncCampaignChannel(campaignChannelId: string | null, data: Record<string, unknown>) {
  if (!campaignChannelId) return;
  await prisma.campaignChannel.update({ where: { id: campaignChannelId }, data }).catch(() => {
    // The campaign row may have been deleted independently — the job's
    // own record of what happened is still authoritative.
  });
}

/**
 * Drives a single SubmissionJob through Modes A (Manual), B (Assisted)
 * and C (Automated) exactly as described in the build spec's sections
 * 8, 9 and 20. This is the only place in the app that touches a live
 * submission page.
 */
export async function runChannelJob(jobId: string, controls: RunnerControls): Promise<void> {
  const job = await prisma.submissionJob.findUniqueOrThrow({
    where: { id: jobId },
    include: {
      story: true,
      storyVersion: true,
      channel: { include: { automationProfile: true, browserProfile: true } },
    },
  });

  const { channel, story, storyVersion } = job;
  const profile = channel.automationProfile;
  const mode = job.mode as 'manual' | 'assisted' | 'automated';

  if (mode === 'automated' && (!profile?.enabled || channel.automationStatus !== 'automated')) {
    throw new ChannelNotConfigured(
      `${channel.name} is not configured and tested for automated submission. Switch this job to Assisted or Manual mode, or finish configuring the channel first.`,
    );
  }

  const submissionUrl = profile?.submissionUrl || channel.submissionUrl || channel.website;
  assertAllowedNavigation(submissionUrl, channel);

  let browserProfileRow = channel.browserProfile;
  if (!browserProfileRow) {
    browserProfileRow = await prisma.browserProfile.create({
      data: {
        channelId: channel.id,
        profileDir: profileDirNameForChannel(channel.id, channel.name),
        status: 'not_configured',
      },
    });
  }

  if (channel.loginRequired && browserProfileRow.status !== 'logged_in') {
    throw new LoginRequiredError(
      `${channel.name} needs a login. Use "Setup Login" for this channel before queueing it.`,
    );
  }

  await updateJob(jobId, { status: 'starting', startedAt: new Date() });
  await logAction({ jobId, channel: channel.name, action: 'Job started', result: 'info' });

  let context: BrowserContext | null = null;
  try {
    context = await launchProfileContext(browserProfileRow.profileDir);
    const page = context.pages()[0] ?? (await context.newPage());

    await updateJob(jobId, { status: 'navigating' });
    let response: Response | null = null;
    try {
      response = await page.goto(submissionUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (navErr) {
      const outcome = await pauseForCheckpoint(jobId, channel.name, page, controls, 'failed_navigation', navErr instanceof Error ? navErr.message : String(navErr));
      if (outcome === 'cancel') return;
      response = null;
    }
    if (response && response.status() >= 400) {
      const outcome = await pauseForCheckpoint(
        jobId,
        channel.name,
        page,
        controls,
        'failed_navigation',
        `The page responded with HTTP ${response.status()}.`,
      );
      if (outcome === 'cancel') return;
    }

    const startedAtUrl = page.url();
    const startShot = await captureScreenshot(page, jobId, 'started');
    await logAction({ jobId, channel: channel.name, action: `Navigated to ${submissionUrl}`, result: 'info', screenshotPath: startShot });

    let blocker = await detectBlocker(page);
    if (blocker) {
      const outcome = await pauseForCheckpoint(jobId, channel.name, page, controls, blocker);
      if (outcome === 'cancel') return;
    }
    if (await checkPause(jobId, channel.name, page, controls)) return;

    if (mode === 'manual') {
      // Mode A — we open the page and hand the author the prepared
      // content; the app does not touch the form at all.
      const shot = await captureScreenshot(page, jobId, 'form_loaded');
      await updateJob(jobId, {
        status: 'waiting_for_user',
        manualInterventionRequired: true,
        manualInterventionReason: 'manual_mode',
        screenshotPath: shot,
      });
      await syncCampaignChannel(job.campaignChannelId, { status: 'waiting_for_user' });
      const decision = await controls.waitForHuman(
        'manual_mode',
        'Copy the prepared fields and complete the submission yourself in the open browser window.',
      );
      if (decision === 'cancel') {
        await finishAsCancelled(jobId, job.campaignChannelId);
        return;
      }
      await finishAsSubmittedManually(jobId, job.campaignChannelId, page.url());
      return;
    }

    // Modes B and C both fill the form the same way — only what
    // happens after filling differs.
    await updateJob(jobId, { status: 'filling' });
    const override = parseContentOverride(job.contentOverrideJson);
    const { screenshotPath: formShot, missingCriticalFields } = await fillForm(page, profile, story, storyVersion, override, jobId, channel.name);
    await logAction({ jobId, channel: channel.name, action: 'Filled supported fields', result: 'success', screenshotPath: formShot });

    if (missingCriticalFields.length > 0) {
      const outcome = await pauseForCheckpoint(
        jobId,
        channel.name,
        page,
        controls,
        'selector_failure',
        `Could not find a field on the page for: ${missingCriticalFields.join(', ')}. The site's form may have changed — update the channel's automation profile.`,
      );
      if (outcome === 'cancel') return;
    }

    blocker = await detectBlocker(page);
    if (blocker) {
      const outcome = await pauseForCheckpoint(jobId, channel.name, page, controls, blocker);
      if (outcome === 'cancel') return;
    }
    if (await checkPause(jobId, channel.name, page, controls)) return;

    const requiresManualReview = mode === 'assisted' || profile?.requiresManualReview !== false;

    if (requiresManualReview) {
      await updateJob(jobId, {
        status: 'waiting_for_user',
        manualInterventionRequired: true,
        manualInterventionReason: 'ready_for_review',
      });
      await syncCampaignChannel(job.campaignChannelId, { status: 'waiting_for_user' });
      const decision = await controls.waitForHuman(
        'ready_for_review',
        'Ready for review. Review the form and click Submit on the website yourself, then press Continue.',
      );
      if (decision === 'cancel') {
        await finishAsCancelled(jobId, job.campaignChannelId);
        return;
      }
    } else {
      await updateJob(jobId, { status: 'submitting' });
      const clicked = await clickButton(page, profile?.submitSelector);
      if (!clicked) {
        throw new Error('Configured submit selector could not be found or clicked.');
      }
      await logAction({ jobId, channel: channel.name, action: 'Clicked submit', result: 'info' });
      const submitShot = await captureScreenshot(page, jobId, 'submitted');
      await logAction({ jobId, channel: channel.name, action: 'Submitted form', result: 'success', screenshotPath: submitShot });
    }

    const outcome = await waitForSuccess(page, {
      successSelector: profile?.successSelector,
      successUrlPattern: profile?.successUrlPattern,
      startUrl: startedAtUrl,
    });

    if (outcome.succeeded && outcome.confident) {
      const shot = await captureScreenshot(page, jobId, 'success');
      await updateJob(jobId, {
        status: 'success',
        completedAt: new Date(),
        publishedUrl: outcome.publishedUrl,
        screenshotPath: shot,
        manualInterventionRequired: false,
      });
      await syncCampaignChannel(job.campaignChannelId, {
        status: 'published',
        publishedUrl: outcome.publishedUrl,
        submissionDate: new Date(),
        screenshotPath: shot,
      });
      await prisma.channel.update({
        where: { id: channel.id },
        data: { lastSuccessfulSubmission: new Date(), failureCount: 0 },
      });
      await logAction({ jobId, channel: channel.name, action: 'Success confirmed', result: 'success', screenshotPath: shot });
      return;
    }

    if (outcome.succeeded && !outcome.confident) {
      const shot = await captureScreenshot(page, jobId, 'success');
      await updateJob(jobId, {
        status: 'success',
        completedAt: new Date(),
        publishedUrl: outcome.publishedUrl ?? null,
        screenshotPath: shot,
        error: 'Submission may have succeeded. Please verify manually.',
        manualInterventionRequired: false,
      });
      await syncCampaignChannel(job.campaignChannelId, {
        status: 'submitted',
        submissionUrl: outcome.publishedUrl ?? null,
        submissionDate: new Date(),
        notes: 'Submission may have succeeded. Please verify manually.',
        screenshotPath: shot,
      });
      await logAction({
        jobId,
        channel: channel.name,
        action: 'Submitted, but success could not be confidently confirmed',
        result: 'info',
        screenshotPath: shot,
      });
      return;
    }

    throw new Error('Could not detect a success signal after submitting.');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    let screenshotPath: string | null = null;
    try {
      if (context) {
        const page = context.pages()[0];
        if (page) screenshotPath = await captureScreenshot(page, jobId, 'failure');
      }
    } catch {
      // best effort
    }
    await updateJob(jobId, {
      status: 'failed',
      completedAt: new Date(),
      error: message,
      screenshotPath,
      manualInterventionRequired: false,
    });
    await syncCampaignChannel(job.campaignChannelId, { status: 'failed', error: message, screenshotPath });
    await prisma.channel
      .update({ where: { id: channel.id }, data: { failureCount: { increment: 1 } } })
      .catch(() => {});
    await logAction({ jobId, channel: channel.name, action: 'Job failed', result: 'failure', error: message, screenshotPath });
    throw err;
  } finally {
    // Leave the window open while we're waiting on the user — only
    // close once the job has truly finished or been cancelled.
    const finalStatus = (await prisma.submissionJob.findUnique({ where: { id: jobId } }))?.status;
    if (finalStatus && finalStatus !== 'waiting_for_user') {
      const { closeContext } = await import('./browser');
      await closeContext(context);
    }
  }
}

/** Section 33's Pause: if the runner has asked this job to pause, stop at this safe point and wait for Resume/Cancel exactly like a checkpoint. Returns true if the caller should stop (job was cancelled from the pause). */
async function checkPause(jobId: string, channelName: string, page: Page, controls: RunnerControls): Promise<boolean> {
  if (!controls.isPauseRequested()) return false;
  controls.clearPauseRequested();
  const outcome = await pauseForCheckpoint(jobId, channelName, page, controls, 'paused_by_user');
  return outcome === 'cancel';
}

async function pauseForCheckpoint(
  jobId: string,
  channelName: string,
  page: Page,
  controls: RunnerControls,
  reason: CheckpointReason | 'paused_by_user',
  detail?: string,
) {
  const shot = await captureScreenshot(page, jobId, 'manual_checkpoint');
  await updateJob(jobId, {
    status: 'waiting_for_user',
    manualInterventionRequired: true,
    manualInterventionReason: reason,
    screenshotPath: shot,
  });
  await logAction({
    jobId,
    channel: channelName,
    action: reason === 'paused_by_user' ? 'Paused by user' : `Manual checkpoint: ${reason}`,
    result: 'info',
    error: detail ?? null,
    screenshotPath: shot,
  });
  const message =
    reason === 'paused_by_user'
      ? 'Paused. Press Resume to continue, or Cancel to stop this job.'
      : detail ?? 'Interact with the browser window, then press Continue.';
  const decision = await controls.waitForHuman(reason, message);
  if (decision === 'cancel') {
    await finishAsCancelled(jobId, null);
  } else {
    await updateJob(jobId, { status: 'filling', manualInterventionRequired: false, manualInterventionReason: null });
  }
  return decision;
}

async function finishAsCancelled(jobId: string, campaignChannelId: string | null) {
  await updateJob(jobId, { status: 'cancelled', completedAt: new Date() });
  await syncCampaignChannel(campaignChannelId, { status: 'skipped' });
}

async function finishAsSubmittedManually(jobId: string, campaignChannelId: string | null, currentUrl: string) {
  await updateJob(jobId, { status: 'success', completedAt: new Date(), publishedUrl: currentUrl });
  await syncCampaignChannel(campaignChannelId, {
    status: 'submitted',
    submissionUrl: currentUrl,
    submissionDate: new Date(),
    notes: 'Submitted manually — record the published URL once it is live.',
  });
}

async function fillForm(
  page: Page,
  profile: NonNullable<Awaited<ReturnType<typeof prisma.channelAutomationProfile.findUnique>>> | null | undefined,
  story: StoryLike & { posterPath: string | null },
  storyVersion: StoryVersionLike | null,
  override: ReturnType<typeof parseContentOverride>,
  jobId: string,
  channelName: string,
): Promise<{ screenshotPath: string; missingCriticalFields: string[] }> {
  if (!profile) {
    throw new ManualModeRequired(`No automation profile is configured for ${channelName} yet.`);
  }

  const content = applyContentOverride(resolveChannelContent(story, storyVersion, profile.editorType), override);
  const missingCriticalFields: string[] = [];

  const titleFilled = await fillInput(page, profile.titleSelector, content.title);
  if (profile.titleSelector && !titleFilled) missingCriticalFields.push('title');

  await fillInput(page, profile.subtitleSelector, content.subtitle);
  await fillInput(page, profile.summarySelector, content.summary);

  const bodyFilled = await fillRichTextEditor(page, profile.bodySelector, content.body, profile.editorType);
  if (profile.bodySelector && !bodyFilled) missingCriticalFields.push('body');

  await fillInput(page, profile.authorSelector, content.author);
  await fillInput(page, profile.linkSelector, content.referenceLink);

  if (profile.categorySelector && content.category) {
    await selectOption(page, profile.categorySelector, content.category);
  }
  if (profile.tagsSelector && content.tags) {
    const tags = csvToList(content.tags);
    await addTags(page, profile.tagsSelector, tags);
  }
  if (profile.imageSelector && story.posterPath) {
    await uploadImage(page, profile.imageSelector, story.posterPath);
  }

  const extra = parseFieldMapping(profile.fieldMappingJson);
  if (extra.canonicalUrl && content.referenceLink) {
    await fillInput(page, extra.canonicalUrl, content.referenceLink);
  }

  const screenshotPath = await captureScreenshot(page, jobId, 'form_filled');
  return { screenshotPath, missingCriticalFields };
}
