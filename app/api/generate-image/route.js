import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';

export const maxDuration = 60;

const VALID_QUALITIES = ['low', 'medium', 'high'];

export async function POST(request) {
  const authError = checkAuth(request);
  if (authError) return authError;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 });
  }

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

  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1536x1024',
        quality,
      }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      return NextResponse.json(
        { error: 'OpenAI returned a non-JSON response' },
        { status: 502 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'OpenAI image generation failed' },
        { status: res.status }
      );
    }

    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json(
        { error: 'No image data returned from OpenAI' },
        { status: 502 }
      );
    }

    return NextResponse.json({ image: b64 });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Unexpected server error' },
      { status: 500 }
    );
  }
}
