import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleRouteError } from '@/lib/apiHelpers';
import { z } from 'zod';

const versionInputSchema = z.object({
  label: z.string().min(1).max(200),
  source: z.enum(['openai', 'manual']).default('manual'),
  headlines: z.array(z.string()).min(1),
  metaDescription: z.string().optional().default(''),
  keywords: z.array(z.string()).optional().default([]),
  hashtags: z.array(z.string()).optional().default([]),
  pressRelease: z.string().optional().default(''),
  editorPitch: z.string().optional().default(''),
});

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const versions = await prisma.storyVersion.findMany({
    where: { storyId: params.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ versions });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const data = versionInputSchema.parse(body);
    const version = await prisma.storyVersion.create({
      data: {
        storyId: params.id,
        label: data.label,
        source: data.source,
        headlines: JSON.stringify(data.headlines),
        metaDescription: data.metaDescription,
        keywords: JSON.stringify(data.keywords),
        hashtags: JSON.stringify(data.hashtags),
        pressRelease: data.pressRelease,
        editorPitch: data.editorPitch,
      },
    });
    return NextResponse.json({ version }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
