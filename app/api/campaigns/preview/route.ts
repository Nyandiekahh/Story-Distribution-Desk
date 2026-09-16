import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleRouteError, jsonError } from '@/lib/apiHelpers';
import { campaignPreviewRequestSchema } from '@/lib/validation';
import { defaultModeForChannel } from '@/lib/jobs/queue';
import { resolveChannelContent } from '@/lib/automation/contentResolution';
import { AUTOMATION_MODE_LABELS } from '@/lib/types';

/**
 * Section 13's Submission Preview: computes exactly what would be typed
 * into each selected channel's form — same resolution logic
 * channelRunner.ts's fillForm uses at run time, so what's previewed
 * here is guaranteed to match what actually gets submitted. Purely a
 * read: no campaign, tracker row, or job is created by this route.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = campaignPreviewRequestSchema.parse(body);

    const [story, storyVersion, channels] = await Promise.all([
      prisma.story.findUnique({ where: { id: input.storyId } }),
      input.storyVersionId ? prisma.storyVersion.findUnique({ where: { id: input.storyVersionId } }) : Promise.resolve(null),
      prisma.channel.findMany({ where: { id: { in: input.channelIds } }, include: { automationProfile: true } }),
    ]);
    if (!story) return jsonError('Story not found', 404);

    const items = channels.map(
      (channel: {
        id: string;
        name: string;
        automationStatus: string;
        automationProfile: { editorType: string } | null;
      }) => {
        const content = resolveChannelContent(story, storyVersion, channel.automationProfile?.editorType);
        const mode = defaultModeForChannel(channel.automationStatus);
        return {
          channelId: channel.id,
          channelName: channel.name,
          automationMode: mode,
          automationModeLabel: AUTOMATION_MODE_LABELS[mode],
          hasAutomationProfile: !!channel.automationProfile,
          imagePresent: !!(story.posterPath || story.imageUrl),
          content,
        };
      },
    );

    // Preserve the order the user selected channels in, not whatever findMany happens to return.
    items.sort((a: { channelId: string }, b: { channelId: string }) => input.channelIds.indexOf(a.channelId) - input.channelIds.indexOf(b.channelId));

    return NextResponse.json({ items });
  } catch (err) {
    return handleRouteError(err);
  }
}
