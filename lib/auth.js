import crypto from 'crypto';
import { NextResponse } from 'next/server';

export const AUTH_COOKIE_NAME = 'cs_auth';

// The cookie stores a hash of the configured password, not the password
// itself, so it isn't trivially readable/replayable from the raw value.
export function getExpectedAuthToken() {
  const password = process.env.ACCESS_PASSWORD;
  if (!password) return null;
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Returns null if the request is authorized (or no gate is configured),
// or a 401 NextResponse to short-circuit the route handler.
export function checkAuth(request) {
  const expected = getExpectedAuthToken();
  if (!expected) return null;

  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookie === expected) return null;

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
