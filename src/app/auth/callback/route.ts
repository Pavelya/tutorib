import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

/**
 * Auth callback handler.
 *
 * Supabase redirects here after magic-link click or Google OAuth.
 * The `code` query param is exchanged for a session server-side,
 * then the user is redirected into the app.
 *
 * The `next` param allows preserving a return-to destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // Auth exchange failed or no code provided — send to sign-in with error hint
  const signInUrl = new URL('/auth/sign-in', origin);
  signInUrl.searchParams.set('error', 'auth_callback_failed');
  return NextResponse.redirect(signInUrl);
}
