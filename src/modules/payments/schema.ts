import { pgTable, uuid, text, timestamp, numeric, index } from 'drizzle-orm/pg-core';
import { appUsers } from '@/modules/accounts/schema';
import { tutorProfiles } from '@/modules/tutors/schema';
import { lessons } from '@/modules/lessons/schema';

// ---------------------------------------------------------------------------
// payments — application-facing payment record tied to Stripe lifecycle.
// Phase 1: authorize at booking-request, capture on tutor acceptance,
// release on decline/expiry.
// ---------------------------------------------------------------------------
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lesson_id: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id),
    payer_app_user_id: uuid('payer_app_user_id')
      .notNull()
      .references(() => appUsers.id),
    stripe_checkout_session_id: text('stripe_checkout_session_id'),
    stripe_payment_intent_id: text('stripe_payment_intent_id'),
    payment_status: text('payment_status').notNull().default('pending'),
    amount: numeric('amount').notNull(),
    currency_code: text('currency_code').notNull().default('USD'),
    authorized_at: timestamp('authorized_at', { withTimezone: true }),
    authorization_expires_at: timestamp('authorization_expires_at', { withTimezone: true }),
    captured_at: timestamp('captured_at', { withTimezone: true }),
    capture_cancelled_at: timestamp('capture_cancelled_at', { withTimezone: true }),
    refunded_at: timestamp('refunded_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_payments_lesson').on(t.lesson_id),
    index('idx_payments_payer').on(t.payer_app_user_id),
    index('idx_payments_status').on(t.payment_status),
  ],
);

// ---------------------------------------------------------------------------
// earnings — tutor-facing earning record linked to lesson fulfillment
// ---------------------------------------------------------------------------
export const earnings = pgTable(
  'earnings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lesson_id: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id),
    tutor_profile_id: uuid('tutor_profile_id')
      .notNull()
      .references(() => tutorProfiles.id),
    earning_status: text('earning_status').notNull().default('pending'),
    gross_amount: numeric('gross_amount').notNull(),
    platform_fee_amount: numeric('platform_fee_amount').notNull(),
    net_amount: numeric('net_amount').notNull(),
    available_at: timestamp('available_at', { withTimezone: true }),
    paid_at: timestamp('paid_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_earnings_lesson').on(t.lesson_id),
    index('idx_earnings_tutor').on(t.tutor_profile_id),
    index('idx_earnings_status').on(t.earning_status),
  ],
);
