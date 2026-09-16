import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { optimizeRequestSchema } from '@/lib/validation';
import { handleRouteError, jsonError } from '@/lib/apiHelpers';
import { OpenAIConfigError, OpenAIRequestError, optimizeStoryContent } from '@/lib/openai';

/**
 * Section 17 of the spec: the only place that talks to OpenAI. Called
 * from the Story editor's "Generate optimized content" button. Never
 * writes the result straight into the story — it comes back to the
 * client for review/editing and is only persisted as a StoryVersion
 * once the author explicitly saves it.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyId, channelType, instructions } = optimizeRequestSchema.parse(body);

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return jsonError('Story not found', 404);

    const content = await optimizeStoryContent(story, { channelType, instructions });
    return NextResponse.json({ content });
  } catch (err) {
    if (err instanceof OpenAIConfigError) return jsonError(err.message, 412);
    if (err instanceof OpenAIRequestError) return jsonError(err.message, 502);
    return handleRouteError(err);
  }
}
