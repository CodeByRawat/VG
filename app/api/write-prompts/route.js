import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import {
  WRITE_PROMPTS_SYSTEM_PROMPT,
  REWRITE_SINGLE_PROMPT_SYSTEM_PROMPT,
} from '@/lib/constants';

export const maxDuration = 60;

async function callOpenAiChat(apiKey, systemPrompt, userContent, maxTokens) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new ApiError('OpenAI returned a non-JSON response', 502);
  }

  if (!res.ok) {
    throw new ApiError(data.error?.message || 'OpenAI request failed', res.status);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new ApiError('No content returned from OpenAI', 502);
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new ApiError('Failed to parse OpenAI JSON response', 502);
  }
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

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

  try {
    // Single-line rewrite mode: re-prompt just one timestamp with the
    // other already-written prompts included as continuity context.
    if (body.rewrite) {
      const { timestamp, narration, otherPrompts } = body.rewrite;
      if (!timestamp || typeof narration !== 'string') {
        return NextResponse.json(
          { error: 'rewrite.timestamp and rewrite.narration are required' },
          { status: 400 }
        );
      }

      const userContent = JSON.stringify({
        otherPrompts: Array.isArray(otherPrompts) ? otherPrompts : [],
        timestamp,
        narration,
      });

      const parsed = await callOpenAiChat(
        apiKey,
        REWRITE_SINGLE_PROMPT_SYSTEM_PROMPT,
        userContent,
        300
      );

      if (!parsed || typeof parsed.prompt !== 'string') {
        return NextResponse.json(
          { error: 'OpenAI response missing prompt string' },
          { status: 502 }
        );
      }

      return NextResponse.json({ prompt: parsed.prompt });
    }

    // Whole-script mode: one call covering every timestamp at once.
    const segments = body.segments;
    if (!Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json({ error: 'segments array is required' }, { status: 400 });
    }

    const userContent = JSON.stringify(
      segments.map((s) => ({ timestamp: s.timestamp, narration: s.narration }))
    );
    const maxTokens = Math.max(segments.length * 60, 2000);

    const parsed = await callOpenAiChat(
      apiKey,
      WRITE_PROMPTS_SYSTEM_PROMPT,
      userContent,
      maxTokens
    );

    if (!parsed || !Array.isArray(parsed.prompts)) {
      return NextResponse.json(
        { error: 'OpenAI response missing prompts array' },
        { status: 502 }
      );
    }

    return NextResponse.json({ prompts: parsed.prompts });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err.message || 'Unexpected server error' },
      { status: 500 }
    );
  }
}
