import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// app_users — canonical application-level identity for every authenticated person
// ---------------------------------------------------------------------------
export const appUsers = pgTable('app_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  auth_user_id: uuid('auth_user_id').notNull().unique(),
  email: text('email').notNull(),
  full_name: text('full_name'),
  avatar_url: text('avatar_url'),
  timezone: text('timezone'),
  preferred_language_code: text('preferred_language_code'),
  onboarding_state: text('onboarding_state').notNull().default('pending'),
  account_status: text('account_status').notNull().default('active'),
  primary_role_context: text('primary_role_context'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// user_roles — role capability table (student, tutor, admin)
// ---------------------------------------------------------------------------
export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  app_user_id: uuid('app_user_id')
    .notNull()
    .references(() => appUsers.id),
  role: text('role').notNull(),
  role_status: text('role_status').notNull().default('active'),
  granted_at: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  revoked_at: timestamp('revoked_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// student_profiles — learner-specific data separate from the generic account
// ---------------------------------------------------------------------------
export const studentProfiles = pgTable('student_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  app_user_id: uuid('app_user_id')
    .notNull()
    .unique()
    .references(() => appUsers.id),
  display_name: text('display_name'),
  current_stage_summary: text('current_stage_summary'),
  notes_visibility_preference: text('notes_visibility_preference').default('tutor_only'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
