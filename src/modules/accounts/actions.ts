'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod/v4';
import { resolveAccountState, ensureAppUser, selectRole } from './service';
import { updateAppUserProfile } from './repository';

const roleSchema = z.enum(['student', 'tutor']);

const updateProfileSchema = z.object({
  fullName: z.string().min(1, 'Name is required.').max(100).trim(),
});

export type UpdateProfileResult = {
  ok: boolean;
  code?: string;
  message?: string;
};

export async function updateProfileAction(
  _prevState: UpdateProfileResult | null,
  formData: FormData,
): Promise<UpdateProfileResult> {
  const state = await resolveAccountState();
  if (state.status === 'unauthenticated' || !('appUser' in state)) {
    return { ok: false, code: 'unauthorized', message: 'You must be signed in.' };
  }

  const raw = { fullName: formData.get('fullName') };
  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'validation_failed',
      message: parsed.error.issues[0]?.message ?? 'Invalid input.',
    };
  }

  await updateAppUserProfile(state.appUser.id, { fullName: parsed.data.fullName });
  return { ok: true };
}

export type SelectRoleResult = {
  ok: boolean;
  code?: string;
  message?: string;
};

/**
 * Server Action: select a role during initial setup.
 *
 * 1. Resolves authenticated user
 * 2. Ensures app_user row exists
 * 3. Validates role choice
 * 4. Creates role + profile state
 * 5. Redirects to the appropriate starting point
 */
export async function selectRoleAction(
  _prevState: SelectRoleResult | null,
  formData: FormData,
): Promise<SelectRoleResult> {
  const rawRole = formData.get('role');
  const parsed = roleSchema.safeParse(rawRole);

  if (!parsed.success) {
    return { ok: false, code: 'validation_failed', message: 'Please select a valid role.' };
  }

  const role = parsed.data;
  const state = await resolveAccountState();

  if (state.status === 'unauthenticated') {
    redirect('/auth/sign-in');
  }

  // Ensure the app_user row exists
  let appUserId: string;
  if (state.status === 'authenticated_no_profile') {
    const appUser = await ensureAppUser(
      state.authUserId,
      state.email,
      state.fullName,
      state.avatarUrl,
    );
    appUserId = appUser.id;
  } else if ('appUser' in state) {
    appUserId = state.appUser.id;
  } else {
    return { ok: false, code: 'unexpected_state', message: 'Unable to resolve account.' };
  }

  // If user already has an active role, redirect them
  if (state.status === 'student_active') {
    redirect('/match');
  }
  if (state.status === 'tutor_active' || state.status === 'tutor_pending_review') {
    redirect('/tutor/overview');
  }

  const result = await selectRole(appUserId, role);

  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }

  // Redirect based on selected role
  if (role === 'student') {
    redirect('/match');
  } else {
    redirect('/tutor/overview');
  }
}
