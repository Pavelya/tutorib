import { pgTable, uuid, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// subjects — canonical IB subject list for tutor capability, learning needs,
//            lessons, and public browse surfaces
// ---------------------------------------------------------------------------
export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  category: text('category'),
  is_active: boolean('is_active').notNull().default(true),
  display_order: integer('display_order').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// subject_focus_areas — IB-specific focus areas (IA, EE, TOK, IO, exam prep, etc.)
// ---------------------------------------------------------------------------
export const subjectFocusAreas = pgTable('subject_focus_areas', {
  id: uuid('id').primaryKey().defaultRandom(),
  subject_id: uuid('subject_id')
    .notNull()
    .references(() => subjects.id),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  display_order: integer('display_order').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// languages — canonical language options for tutoring and profile display
// ---------------------------------------------------------------------------
export const languages = pgTable('languages', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  display_order: integer('display_order').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// countries — canonical country list for tutor residency, payout checks, etc.
// ---------------------------------------------------------------------------
export const countries = pgTable('countries', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  display_order: integer('display_order').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// meeting_providers — supported external meeting providers for lesson access
// ---------------------------------------------------------------------------
export const meetingProviders = pgTable('meeting_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  display_order: integer('display_order').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// video_media_providers — supported external video providers for tutor intro videos
// ---------------------------------------------------------------------------
export const videoMediaProviders = pgTable('video_media_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  display_order: integer('display_order').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
