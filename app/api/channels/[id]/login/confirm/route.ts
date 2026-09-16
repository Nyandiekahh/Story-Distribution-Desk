import { NextRequest, NextResponse } from 'next/server';
import { confirmLoginSetup } from '@/lib/playwright/loginFlow';
import { handleRouteError } from '@/lib/apiHelpers';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profile = await confirmLoginSetup(params.id);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleRouteError(err);
  }
}
