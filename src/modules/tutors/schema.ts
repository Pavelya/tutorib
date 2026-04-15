import { pgTable, uuid, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { appUsers } from '@/modules/accounts/schema';
import { subjects, subjectFocusAreas, languages } from '@/modules/reference/schema';

// ---------------------------------------------------------------------------
// tutor_profiles — canonical tutor object for public display and owner editing
// ---------------------------------------------------------------------------
export const tutorProfiles = pgTable(
  'tutor_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    app_user_id: uuid('app_user_id')
      .notNull()
      .unique()
      .references(() => appUsers.id),
    display_name: text('display_name'),
    public_slug: text('public_slug').unique(),
    headline: text('headline'),
    bio: text('bio'),
    teaching_style_summary: text('teaching_style_summary'),
    best_for_summary: text('best_for_summary'),
    pricing_summary: text('pricing_summary'),

    // Visibility and listing states
    profile_visibility_status: text('profile_visibility_status').notNull().default('draft'),
    application_status: text('application_status').notNull().default('not_submitted'),
    public_listing_status: text('public_listing_status').notNull().default('unlisted'),
    payout_readiness_status: text('payout_readiness_status').notNull().default('not_started'),

    // External intro video reference (uses video_media_providers vocabulary)
    intro_video_provider: text('intro_video_provider'),
    intro_video_external_id: text('intro_video_external_id'),
    intro_video_url: text('intro_video_url'),

    // Country for residency/payout context
    country_code: text('country_code'),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_tutor_profiles_public_slug').on(t.public_slug),
    index('idx_tutor_profiles_listing_status').on(t.public_listing_status),
  ],
);

// ---------------------------------------------------------------------------
// tutor_subject_capabilities — which subjects and focus areas a tutor can teach
// ---------------------------------------------------------------------------
export const tutorSubjectCapabilities = pgTable(
  'tutor_subject_capabilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tutor_profile_id: uuid('tutor_profile_id')
      .notNull()
      .references(() => tutorProfiles.id),
    subject_id: uuid('subject_id')
      .notNull()
      .references(() => subjects.id),
    subject_focus_area_id: uuid('subject_focus_area_id')
      .references(() => subjectFocusAreas.id),
    experience_summary: text('experience_summary'),
    display_priority: integer('display_priority').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_tutor_subject_caps_tutor').on(t.tutor_profile_id),
    index('idx_tutor_subject_caps_subject').on(t.subject_id),
  ],
);

// ---------------------------------------------------------------------------
// tutor_language_capabilities — structured tutoring language support per tutor
// ---------------------------------------------------------------------------
export const tutorLanguageCapabilities = pgTable(
  'tutor_language_capabilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tutor_profile_id: uuid('tutor_profile_id')
      .notNull()
      .references(() => tutorProfiles.id),
    language_code: text('language_code')
      .notNull()
      .references(() => languages.code),
    display_priority: integer('display_priority').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_tutor_lang_caps_tutor').on(t.tutor_profile_id),
  ],
);

// ---------------------------------------------------------------------------
// tutor_credentials — private evidence records for verification and trust review
// ---------------------------------------------------------------------------
export const tutorCredentials = pgTable(
  'tutor_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tutor_profile_id: uuid('tutor_profile_id')
      .notNull()
      .references(() => tutorProfiles.id),
    credential_type: text('credential_type').notNull(),
    title: text('title').notNull(),
    issuing_body: text('issuing_body'),
    storage_object_path: text('storage_object_path'),
    review_status: text('review_status').notNull().default('pending'),
    reviewed_at: timestamp('reviewed_at', { withTimezone: true }),
    public_display_preference: boolean('public_display_preference').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_tutor_credentials_tutor').on(t.tutor_profile_id),
  ],
);
