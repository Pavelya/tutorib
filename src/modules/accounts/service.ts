import { createSupabaseServer } from '@/lib/supabase/server';
import {
  findAppUserByAuthId,
  createAppUser,
  findActiveRoles,
  insertRoleAndUpdateUser,
  type AppUser,
} from './repository';

export type AccountState =
  | { status: 'unauthenticated' }
  | { status: 'authenticated_no_profile'; authUserId: string; email: string; fullName?: string; avatarUrl?: string }
  | { status: 'authenticated_role_pending'; appUser: AppUser }
  | { status: 'student_active'; appUser: AppUser }
  | { status: 'tutor_active'; appUser: AppUser }
  | { status: 'tutor_pending_review'; appUser: AppUser };

/**
 * Resolve the current user's full account state from Supabase session + app tables.
 * This is the canonical way to determine where a user should be routed.
 */
export async function resolveAccountState(): Promise<AccountState> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'unauthenticated' };
  }

  const appUser = await findAppUserByAuthId(user.id);

  if (!appUser) {
    return {
      status: 'authenticated_no_profile',
      authUserId: user.id,
      email: user.email ?? '',
      fullName: user.user_metadata?.full_name as string | undefined,
      avatarUrl: user.user_metadata?.avatar_url as string | undefined,
    };
  }

  if (appUser.onboarding_state === 'pending') {
    return { status: 'authenticated_role_pending', appUser };
  }

  const roles = await findActiveRoles(appUser.id);
  const roleNames = roles.map((r) => r.role);

  if (roleNames.includes('tutor')) {
    const tutorRole = roles.find((r) => r.role === 'tutor');
    if (tutorRole?.role_status === 'active') {
      return { status: 'tutor_active', appUser };
    }
    return { status: 'tutor_pending_review', appUser };
  }

  if (roleNames.includes('student')) {
    return { status: 'student_active', appUser };
  }

  // Has a profile but no active roles — treat as role pending
  return { status: 'authenticated_role_pending', appUser };
}

/**
 * Ensure an app_user row exists for the authenticated Supabase user.
 * Creates one if missing. Returns the app_user.
 */
export async function ensureAppUser(authUserId: string, email: string, fullName?: string, avatarUrl?: string): Promise<AppUser> {
  const existing = await findAppUserByAuthId(authUserId);
  if (existing) return existing;
  return createAppUser({ authUserId, email, fullName, avatarUrl });
}

/**
 * Select a role for a user. Validates that the user hasn't already selected one.
 */
export async function selectRole(
  appUserId: string,
  role: 'student' | 'tutor',
): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const existingRoles = await findActiveRoles(appUserId);
  if (existingRoles.length > 0) {
    return { ok: false, code: 'role_already_selected', message: 'You have already selected a role.' };
  }

  await insertRoleAndUpdateUser(appUserId, role);
  return { ok: true };
}
