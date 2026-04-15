import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { findAppUserByAuthId, findActiveRoles } from '@/modules/accounts/repository';

/**
 * Auth callback handler.
 *
 * Supabase redirects here after magic-link click or Google OAuth.
 * The `code` query param is exchanged for a session server-side,
 * then the user is routed based on their profile state:
 *
 * - No app_user or no role → /setup/role
 * - Student role active   → /match (or `next` param)
 * - Tutor role active     → /tutor/overview (or `next` param)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const destination = await resolvePostAuthDestination(user.id, next);
        return NextResponse.redirect(new URL(destination, origin));
      }

      // Session exchanged but no user — unusual, send to setup
      return NextResponse.redirect(new URL('/setup/role', origin));
    }
  }

  // Auth exchange failed or no code provided — send to sign-in with error hint
  const signInUrl = new URL('/auth/sign-in', origin);
  signInUrl.searchParams.set('error', 'auth_callback_failed');
  return NextResponse.redirect(signInUrl);
}

/**
 * Determine where to send the user after successful auth.
 * If `next` is provided and the user has a complete profile, honour it.
 * Otherwise route based on account state.
 */
async function resolvePostAuthDestination(
  authUserId: string,
  next: string | null,
): Promise<string> {
  const appUser = await findAppUserByAuthId(authUserId);

  if (!appUser || appUser.onboarding_state === 'pending') {
    return '/setup/role';
  }

  const roles = await findActiveRoles(appUser.id);
  const roleNames = roles.map((r) => r.role);

  // If caller specified a return-to destination, honour it for users with roles
  if (next && roleNames.length > 0) {
    return next;
  }

  if (roleNames.includes('student')) {
    return '/match';
  }

  if (roleNames.includes('tutor')) {
    return '/tutor/overview';
  }

  // Has profile but no roles — needs role selection
  return '/setup/role';
}
