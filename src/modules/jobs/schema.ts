import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  uniqueIndex,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// job_runs — durable background-job tracking with retry and dead-letter support
// ---------------------------------------------------------------------------
export const jobRuns = pgTable(
  'job_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    job_type: text('job_type').notNull(),
    job_status: text('job_status').notNull().default('pending'),
    idempotency_key: text('idempotency_key'),
    trigger_object_type: text('trigger_object_type'),
    trigger_object_id: uuid('trigger_object_id'),
    payload: jsonb('payload'),
    attempt_number: integer('attempt_number').notNull().default(0),
    max_attempts: integer('max_attempts').notNull().default(5),
    next_retry_at: timestamp('next_retry_at', { withTimezone: true }),
    started_at: timestamp('started_at', { withTimezone: true }),
    finished_at: timestamp('finished_at', { withTimezone: true }),
    failure_code: text('failure_code'),
    failure_message: text('failure_message'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_job_runs_idempotency_key')
      .on(t.idempotency_key)
      .where(sql`idempotency_key IS NOT NULL`),
    index('idx_job_runs_status_retry').on(t.job_status, t.next_retry_at),
    index('idx_job_runs_job_type').on(t.job_type),
  ],
);

// ---------------------------------------------------------------------------
// webhook_events — provider webhook receipt, verification, and idempotency
// ---------------------------------------------------------------------------
export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull(),
    provider_event_id: text('provider_event_id').notNull(),
    event_type: text('event_type').notNull(),
    verification_status: text('verification_status').notNull(),
    processing_status: text('processing_status').notNull().default('pending'),
    payload: jsonb('payload'),
    failure_message: text('failure_message'),
    received_at: timestamp('received_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    processed_at: timestamp('processed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_webhook_events_provider_event')
      .on(t.provider, t.provider_event_id),
    index('idx_webhook_events_processing_status').on(t.processing_status),
  ],
);
