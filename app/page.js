import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, getExpectedAuthToken } from '@/lib/auth';
import AppShell from '@/components/AppShell';

export default function Home() {
  const passwordRequired = !!process.env.ACCESS_PASSWORD;
  let authed = !passwordRequired;

  if (passwordRequired) {
    const expected = getExpectedAuthToken();
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    authed = token === expected;
  }

  return <AppShell passwordRequired={passwordRequired} initialAuthed={authed} />;
}
