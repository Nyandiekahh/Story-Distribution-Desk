import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { automationProfileInputSchema } from '@/lib/validation';
import { handleRouteError, jsonError } from '@/lib/apiHelpers';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const profile = await prisma.channelAutomationProfile.findUnique({ where: { channelId: params.id } });
  return NextResponse.json({ profile });
}

/** Upsert — a channel either has zero or one automation profile (spec section 5). */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const data = automationProfileInputSchema.parse(body);

    const channel = await prisma.channel.findUnique({ where: { id: params.id } });
    if (!channel) return jsonError('Channel not found', 404);

    const profile = await prisma.channelAutomationProfile.upsert({
      where: { channelId: params.id },
      update: data,
      create: { channelId: params.id, ...data },
    });

    // Editing selectors invalidates any previous "tested" status —
    // guardrails.md and section 26 both say a channel only earns
    // Automated by being re-tested after a change like this.
    await prisma.channel.update({
      where: { id: params.id },
      data: { lastTestedAt: null, ...(channel.automationStatus === 'automated' ? { automationStatus: 'needs_configuration' } : {}) },
    });

    return NextResponse.json({ profile });
  } catch (err) {
    return handleRouteError(err);
  }
}
