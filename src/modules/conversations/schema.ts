import { pgTable, uuid, text, timestamp, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { appUsers } from '@/modules/accounts/schema';
import { studentProfiles } from '@/modules/accounts/schema';
import { tutorProfiles } from '@/modules/tutors/schema';

// ---------------------------------------------------------------------------
// conversations — canonical thread between one student and one tutor (Phase 1)
// ---------------------------------------------------------------------------
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    student_profile_id: uuid('student_profile_id')
      .notNull()
      .references(() => studentProfiles.id),
    tutor_profile_id: uuid('tutor_profile_id')
      .notNull()
      .references(() => tutorProfiles.id),
    conversation_status: text('conversation_status').notNull().default('active'),
    origin_learning_need_id: uuid('origin_learning_need_id'),
    last_message_at: timestamp('last_message_at', { withTimezone: true }),
    last_message_id: uuid('last_message_id'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_conversations_student_tutor').on(t.student_profile_id, t.tutor_profile_id),
    index('idx_conversations_student').on(t.student_profile_id),
    index('idx_conversations_tutor').on(t.tutor_profile_id),
  ],
);

// ---------------------------------------------------------------------------
// conversation_participants — participant state and thread-specific preferences
// ---------------------------------------------------------------------------
export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversation_id: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id),
    app_user_id: uuid('app_user_id')
      .notNull()
      .references(() => appUsers.id),
    participant_role: text('participant_role').notNull(),
    is_muted: boolean('is_muted').notNull().default(false),
    is_archived: boolean('is_archived').notNull().default(false),
    joined_at: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_conversation_participants_conv_user').on(t.conversation_id, t.app_user_id),
    index('idx_conversation_participants_user').on(t.app_user_id),
  ],
);

// ---------------------------------------------------------------------------
// messages — canonical message store
// ---------------------------------------------------------------------------
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversation_id: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id),
    sender_app_user_id: uuid('sender_app_user_id')
      .notNull()
      .references(() => appUsers.id),
    reply_to_message_id: uuid('reply_to_message_id'),
    body: text('body').notNull(),
    message_status: text('message_status').notNull().default('sent'),
    edited_at: timestamp('edited_at', { withTimezone: true }),
    removed_at: timestamp('removed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_messages_conversation').on(t.conversation_id),
    index('idx_messages_sender').on(t.sender_app_user_id),
    index('idx_messages_conversation_created').on(t.conversation_id, t.created_at),
  ],
);

// ---------------------------------------------------------------------------
// message_reads — unread/read state tracking per participant per message
// ---------------------------------------------------------------------------
export const messageReads = pgTable(
  'message_reads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    message_id: uuid('message_id')
      .notNull()
      .references(() => messages.id),
    app_user_id: uuid('app_user_id')
      .notNull()
      .references(() => appUsers.id),
    read_at: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_message_reads_message_user').on(t.message_id, t.app_user_id),
    index('idx_message_reads_user').on(t.app_user_id),
  ],
);

// ---------------------------------------------------------------------------
// user_blocks — blocking rule between users (affects messaging and interaction)
// ---------------------------------------------------------------------------
export const userBlocks = pgTable(
  'user_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blocker_app_user_id: uuid('blocker_app_user_id')
      .notNull()
      .references(() => appUsers.id),
    blocked_app_user_id: uuid('blocked_app_user_id')
      .notNull()
      .references(() => appUsers.id),
    block_status: text('block_status').notNull().default('active'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_user_blocks_pair').on(t.blocker_app_user_id, t.blocked_app_user_id),
    index('idx_user_blocks_blocked').on(t.blocked_app_user_id),
  ],
);

// ---------------------------------------------------------------------------
// abuse_reports — user-submitted report for moderation and trust review
// ---------------------------------------------------------------------------
export const abuseReports = pgTable(
  'abuse_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporter_app_user_id: uuid('reporter_app_user_id')
      .notNull()
      .references(() => appUsers.id),
    reported_app_user_id: uuid('reported_app_user_id')
      .notNull()
      .references(() => appUsers.id),
    conversation_id: uuid('conversation_id')
      .references(() => conversations.id),
    message_id: uuid('message_id')
      .references(() => messages.id),
    report_type: text('report_type').notNull(),
    report_status: text('report_status').notNull().default('open'),
    summary: text('summary'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_abuse_reports_reported').on(t.reported_app_user_id),
    index('idx_abuse_reports_status').on(t.report_status),
  ],
);
