import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { appUsers } from '@/modules/accounts/schema';

// ---------------------------------------------------------------------------
// notifications — in-app user notification object
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    app_user_id: uuid('app_user_id')
      .notNull()
      .references(() => appUsers.id),
    notification_type: text('notification_type').notNull(),
    notification_status: text('notification_status').notNull().default('unread'),
    object_type: text('object_type'),
    object_id: uuid('object_id'),
    title: text('title').notNull(),
    body_summary: text('body_summary'),
    read_at: timestamp('read_at', { withTimezone: true }),
    dismissed_at: timestamp('dismissed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_notifications_user_status').on(t.app_user_id, t.notification_status),
    index('idx_notifications_user_created').on(t.app_user_id, t.created_at),
  ],
);

// ---------------------------------------------------------------------------
// notification_deliveries — delivery-attempt tracking for outbound notifications
// ---------------------------------------------------------------------------
export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notification_id: uuid('notification_id')
      .notNull()
      .references(() => notifications.id),
    channel: text('channel').notNull(),
    delivery_status: text('delivery_status').notNull().default('queued'),
    provider_message_id: text('provider_message_id'),
    attempted_at: timestamp('attempted_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_notification_deliveries_notification').on(t.notification_id),
    index('idx_notification_deliveries_status').on(t.delivery_status),
  ],
);

// ---------------------------------------------------------------------------
// policy_notice_versions — versioned legal-notice records (terms, privacy, etc.)
// ---------------------------------------------------------------------------
export const policyNoticeVersions = pgTable(
  'policy_notice_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notice_type: text('notice_type').notNull(),
    version_label: text('version_label').notNull(),
    published_at: timestamp('published_at', { withTimezone: true }),
    effective_at: timestamp('effective_at', { withTimezone: true }),
    requires_acknowledgement: boolean('requires_acknowledgement')
      .notNull()
      .default(false),
    title: text('title').notNull(),
    summary: text('summary'),
    document_url: text('document_url'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_policy_notice_versions_type_version').on(
      t.notice_type,
      t.version_label,
    ),
    index('idx_policy_notice_versions_type').on(t.notice_type),
  ],
);

// ---------------------------------------------------------------------------
// policy_notice_receipts — per-user receipt and acknowledgement for legal notices
// ---------------------------------------------------------------------------
export const policyNoticeReceipts = pgTable(
  'policy_notice_receipts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    policy_notice_version_id: uuid('policy_notice_version_id')
      .notNull()
      .references(() => policyNoticeVersions.id),
    app_user_id: uuid('app_user_id')
      .notNull()
      .references(() => appUsers.id),
    first_shown_at: timestamp('first_shown_at', { withTimezone: true }),
    viewed_at: timestamp('viewed_at', { withTimezone: true }),
    acknowledged_at: timestamp('acknowledged_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_policy_notice_receipts_version_user').on(
      t.policy_notice_version_id,
      t.app_user_id,
    ),
    index('idx_policy_notice_receipts_user').on(t.app_user_id),
  ],
);
