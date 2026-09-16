import { NextRequest, NextResponse } from 'next/server';
import { cancelLoginSetup } from '@/lib/playwright/loginFlow';
import { handleRouteError } from '@/lib/apiHelpers';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await cancelLoginSetup(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
