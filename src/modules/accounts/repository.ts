import { eq, and } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { appUsers, userRoles, studentProfiles } from './schema';

export type AppUser = typeof appUsers.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;

/**
 * Find an app_user by their Supabase auth user id.
 */
export async function findAppUserByAuthId(authUserId: string): Promise<AppUser | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.auth_user_id, authUserId))
    .limit(1);
  return rows[0];
}

/**
 * Create an app_user from Supabase auth identity.
 */
export async function createAppUser(data: {
  authUserId: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}): Promise<AppUser> {
  const db = getDb();
  const rows = await db
    .insert(appUsers)
    .values({
      auth_user_id: data.authUserId,
      email: data.email,
      full_name: data.fullName ?? null,
      avatar_url: data.avatarUrl ?? null,
      onboarding_state: 'pending',
    })
    .returning();
  return rows[0];
}

/**
 * Find active roles for an app_user.
 */
export async function findActiveRoles(appUserId: string): Promise<UserRole[]> {
  const db = getDb();
  return db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.app_user_id, appUserId), eq(userRoles.role_status, 'active')));
}

/**
 * Insert a new role for an app_user and update their onboarding/primary_role state.
 */
export async function insertRoleAndUpdateUser(
  appUserId: string,
  role: 'student' | 'tutor',
): Promise<void> {
  const db = getDb();

  await db.insert(userRoles).values({
    app_user_id: appUserId,
    role,
    role_status: 'active',
  });

  await db
    .update(appUsers)
    .set({
      onboarding_state: 'role_selected',
      primary_role_context: role,
      updated_at: new Date(),
    })
    .where(eq(appUsers.id, appUserId));

  // For student role, also create the student_profiles row
  if (role === 'student') {
    await db.insert(studentProfiles).values({
      app_user_id: appUserId,
    });
  }
}
