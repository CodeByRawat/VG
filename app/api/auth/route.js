import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getExpectedAuthToken } from '@/lib/auth';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const configuredPassword = process.env.ACCESS_PASSWORD;

  // No gate configured: nothing to check.
  if (!configuredPassword) {
    return NextResponse.json({ ok: true });
  }

  if (typeof body.password !== 'string' || body.password !== configuredPassword) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const token = getExpectedAuthToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
