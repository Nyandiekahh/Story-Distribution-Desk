import { prisma } from '../db';
import { jobRunner } from './runner';
import { getSettings } from './settings';
import type { AutomationMode, ContentOverride } from '../types';

/** A channel's automationStatus decides the *default* mode a new job runs in — never invented, never upgraded automatically. */
export function defaultModeForChannel(automationStatus: string): AutomationMode {
  if (automationStatus === 'automated') return 'automated';
  if (automationStatus === 'partially_automated') return 'assisted';
  return 'manual';
}

export interface QueueChannelsParams {
  storyId: string;
  storyVersionId?: string | null;
  channelIds: string[];
  campaignId?: string | null;
  modeOverride?: AutomationMode;
  /**
   * Section 13's Submission Preview lets the user edit exactly what gets
   * typed into each channel's form before anything is queued. Keyed by
   * channelId. When a channel isn't part of a campaign (an ad-hoc
   * /api/jobs call) this is the only place the override is stored; when
   * it is part of a campaign, it's also persisted on the CampaignChannel
   * row so a scheduled campaign remembers it until the scheduler
   * actually queues the job later.
   */
  contentOverrides?: Record<string, ContentOverride>;
}

async function registerCampaignLimits(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return;
  jobRunner.setCampaignLimits(campaignId, {
    maxConcurrentJobs: campaign.maxConcurrentJobs ?? null,
    minDelaySeconds: campaign.minDelayMinutes != null ? campaign.minDelayMinutes * 60 : null,
  });
}

export async function queueChannelsForStory(params: QueueChannelsParams) {
  const { storyId, storyVersionId, channelIds, campaignId, modeOverride, contentOverrides } = params;
  const settings = await getSettings();

  if (campaignId) {
    await registerCampaignLimits(campaignId);
  }

  const channels = await prisma.channel.findMany({ where: { id: { in: channelIds } } });
  const created: { jobId: string; channelId: string; skipped?: string }[] = [];

  for (const channel of channels) {
    if (!channel.enabled || channel.automationStatus === 'disabled') {
      created.push({ jobId: '', channelId: channel.id, skipped: 'Channel is disabled' });
      continue;
    }

    const mode = modeOverride ?? defaultModeForChannel(channel.automationStatus);
    const overrideForChannel = contentOverrides?.[channel.id];
    const overrideJson = overrideForChannel ? JSON.stringify(overrideForChannel) : undefined;

    let campaignChannelId: string | null = null;
    let jobOverrideJson: string | null = overrideJson ?? null;

    if (campaignId) {
      const cc = await prisma.campaignChannel.upsert({
        where: { campaignId_channelId: { campaignId, channelId: channel.id } },
        update: {
          status: 'queued',
          automationMode: mode,
          error: null,
          ...(overrideJson !== undefined ? { contentOverrideJson: overrideJson } : {}),
        },
        create: { campaignId, channelId: channel.id, status: 'queued', automationMode: mode, contentOverrideJson: overrideJson ?? null },
      });
      campaignChannelId = cc.id;
      // A scheduled campaign's override was captured at creation time and
      // lives on the tracker row until the scheduler queues it now —
      // that's the value the job should run with even though this call
      // itself received no fresh `contentOverrides`.
      jobOverrideJson = cc.contentOverrideJson ?? null;
    }

    const job = await prisma.submissionJob.create({
      data: {
        storyId,
        storyVersionId: storyVersionId ?? null,
        channelId: channel.id,
        campaignId: campaignId ?? null,
        campaignChannelId,
        mode,
        status: 'queued',
        maxRetries: settings.maxRetries,
        contentOverrideJson: jobOverrideJson,
      },
    });

    created.push({ jobId: job.id, channelId: channel.id });
    await jobRunner.enqueue(job.id, { channelId: channel.id, campaignId: campaignId ?? null });
  }

  return created;
}

export async function retryJob(jobId: string) {
  const job = await prisma.submissionJob.findUniqueOrThrow({ where: { id: jobId } });
  if (job.retryCount >= job.maxRetries) {
    throw new Error(`This job has already used its ${job.maxRetries} retry attempt(s). Increase Max Retries in Settings to allow more.`);
  }

  const next = await prisma.submissionJob.create({
    data: {
      storyId: job.storyId,
      storyVersionId: job.storyVersionId,
      channelId: job.channelId,
      campaignId: job.campaignId,
      campaignChannelId: job.campaignChannelId,
      mode: job.mode,
      status: 'queued',
      retryCount: job.retryCount + 1,
      maxRetries: job.maxRetries,
      contentOverrideJson: job.contentOverrideJson,
    },
  });

  if (job.campaignChannelId) {
    await prisma.campaignChannel.update({ where: { id: job.campaignChannelId }, data: { status: 'queued', error: null } });
  }
  if (job.campaignId) {
    await registerCampaignLimits(job.campaignId);
  }

  await jobRunner.enqueue(next.id, { channelId: next.channelId, campaignId: next.campaignId });
  return next;
}

export async function switchChannelMode(campaignChannelId: string, mode: AutomationMode) {
  return prisma.campaignChannel.update({ where: { id: campaignChannelId }, data: { automationMode: mode } });
}
