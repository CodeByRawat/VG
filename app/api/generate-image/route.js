import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { generateImage } from '@/lib/imageProviders';

export const maxDuration = 60;

const VALID_QUALITIES = ['low', 'medium', 'high'];
const VALID_PROVIDERS = ['openai', 'nanobanana'];

export async function POST(request) {
  const authError = checkAuth(request);
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { prompt } = body;
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }
  const quality = VALID_QUALITIES.includes(body.quality) ? body.quality : 'medium';
  const provider = VALID_PROVIDERS.includes(body.provider) ? body.provider : 'openai';

  try {
    const buffer = await generateImage(prompt, { quality, provider, size: '1536x1024' });
    return NextResponse.json({ image: buffer.toString('base64') });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Unexpected server error' },
      { status: 500 }
    );
  }
}
