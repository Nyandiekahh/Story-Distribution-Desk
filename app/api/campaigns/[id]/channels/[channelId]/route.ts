import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleRouteError } from '@/lib/apiHelpers';
import { AUTOMATION_MODES } from '@/lib/types';
import { z } from 'zod';

const patchSchema = z.object({
  automationMode: z.enum(AUTOMATION_MODES).optional(),
  status: z.enum(['to_do', 'skipped']).optional(),
  publishedUrl: z.string().optional(),
  notes: z.string().optional(),
});

/** Switching a single campaign row's mode (e.g. "Switch to Assisted") or manually skipping/recording a URL — section 20 and 22. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; channelId: string } },
) {
  try {
    const body = await request.json();
    const data = patchSchema.parse(body);
    const campaignChannel = await prisma.campaignChannel.update({
      where: { campaignId_channelId: { campaignId: params.id, channelId: params.channelId } },
      data,
    });
    return NextResponse.json({ campaignChannel });
  } catch (err) {
    return handleRouteError(err);
  }
}
