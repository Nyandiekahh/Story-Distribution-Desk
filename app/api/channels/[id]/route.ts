import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { channelInputSchema } from '@/lib/validation';
import { handleRouteError, jsonError } from '@/lib/apiHelpers';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const channel = await prisma.channel.findUnique({
    where: { id: params.id },
    include: { automationProfile: true, browserProfile: true },
  });
  if (!channel) return jsonError('Channel not found', 404);
  return NextResponse.json({ channel });
}

/**
 * Guardrail from section 26: nothing outside of a successful Test
 * Automation run is allowed to flip a channel to "automated".
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();

    if (body.automationStatus === 'automated') {
      const channel = await prisma.channel.findUnique({
        where: { id: params.id },
        include: { automationProfile: true },
      });
      if (!channel?.automationProfile?.enabled || !channel.lastTestedAt) {
        return jsonError(
          'A channel can only be switched to Automated after its automation profile has been configured and successfully tested. Use "Test Automation" first.',
          422,
        );
      }
    }

    const data = channelInputSchema.partial().parse(body);
    const channel = await prisma.channel.update({ where: { id: params.id }, data });
    return NextResponse.json({ channel });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.channel.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
