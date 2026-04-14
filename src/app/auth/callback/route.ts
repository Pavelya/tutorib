import { NextResponse } from 'next/server';

export async function GET() {
  // Auth callback handler — implemented in P1-AUTH-001
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
}
