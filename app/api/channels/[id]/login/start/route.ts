import { NextRequest, NextResponse } from 'next/server';
import { startLoginSetup } from '@/lib/playwright/loginFlow';
import { handleRouteError } from '@/lib/apiHelpers';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await startLoginSetup(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
