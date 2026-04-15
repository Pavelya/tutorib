import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { findAppUserByAuthId, findActiveRoles } from '@/modules/accounts/repository';
import { validateRedirectPath } from '@/lib/auth/allowed-redirects';
import type { AuthErrorCode } from '@/lib/auth/auth-errors';

/**
 * Auth callback handler.
 *
 * Supabase redirects here after magic-link click or Google OAuth.
 * The `code` query param is exchanged for a session server-side,
 * then the user is routed based on their profile state:
 *
 * - No app_user or no role → /setup/role
 * - Student role active   → /match (or validated `next` param)
 * - Tutor role active     → /tutor/overview (or validated `next` param)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  // Supabase may forward error information via query params when the
  // provider flow or magic-link verification fails on their side.
  const supabaseError = searchParams.get('error');
  const supabaseErrorDescription = searchParams.get('error_description');

  // Provider-side or link-level failure before we even have a code
  if (supabaseError) {
    const errorCode = mapSupabaseError(supabaseError, supabaseErrorDescription);
    return redirectToSignIn(origin, errorCode);
  }

  if (!code) {
    return redirectToSignIn(origin, 'missing_code');
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorCode = mapExchangeError(error.message);
    return redirectToSignIn(origin, errorCode);
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirectToSignIn(origin, 'session_missing');
  }

  const destination = await resolvePostAuthDestination(user.id, next);
  return NextResponse.redirect(new URL(destination, origin));
}

/**
 * Map Supabase-forwarded error params to our typed error codes.
 */
function mapSupabaseError(
  error: string,
  description: string | null,
): AuthErrorCode {
  const desc = (description ?? '').toLowerCase();

  if (desc.includes('expired') || desc.includes('otp_expired')) {
    return 'link_expired';
  }

  if (error === 'access_denied' || error === 'server_error') {
    return 'provider_error';
  }

  return 'auth_callback_failed';
}

/**
 * Map code-exchange errors to typed error codes.
 */
function mapExchangeError(message: string): AuthErrorCode {
  const lower = message.toLowerCase();

  if (lower.includes('expired') || lower.includes('otp_expired')) {
    return 'link_expired';
  }

  return 'exchange_failed';
}

/**
 * Build a redirect to the sign-in page with a typed error hint.
 */
function redirectToSignIn(origin: string, errorCode: AuthErrorCode): NextResponse {
  const signInUrl = new URL('/auth/sign-in', origin);
  signInUrl.searchParams.set('error', errorCode);
  return NextResponse.redirect(signInUrl);
}

/**
 * Determine where to send the user after successful auth.
 * If `next` is provided, passes the allowlist, and the user has a
 * complete profile, honour it. Otherwise route based on account state.
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

  // Validate the return-to destination against the allowlist
  const validatedNext = validateRedirectPath(next);

  if (validatedNext && roleNames.length > 0) {
    return validatedNext;
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
