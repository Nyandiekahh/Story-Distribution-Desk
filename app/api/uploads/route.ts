import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { jsonError } from '@/lib/apiHelpers';

const UPLOADS_DIR = path.resolve(process.cwd(), 'public/uploads');
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/** Local image upload for a story's poster/featured image (section 16). Stored under public/uploads so it's servable directly by Next and also usable as a Playwright file-input path. */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) return jsonError('No file provided', 400);
  if (!ALLOWED_TYPES.has(file.type)) return jsonError('Unsupported image type', 415);
  if (file.size > MAX_BYTES) return jsonError('Image is larger than 8MB', 413);

  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);

  return NextResponse.json({
    path: path.join(UPLOADS_DIR, filename),
    url: `/uploads/${filename}`,
  });
}
