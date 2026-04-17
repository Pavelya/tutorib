import { DateTime } from 'luxon';
import { resolveAccountState } from '@/modules/accounts/service';
import { findStudentProfileByAppUserId } from '@/modules/learning-needs/repository';
import { getStripe } from '@/lib/stripe/client';
import { getServerEnv } from '@/lib/env/server';
import { site } from '@/lib/config/site';
import {
  findBookingContextByMatchCandidateId,
  insertLessonRequest,
  insertLessonStatusHistory,
} from './repository';
import {
  insertPendingPayment,
  attachCheckoutSessionToPayment,
} from '@/modules/payments/repository';
import type {
  BookingContextDto,
  BookingContextResult,
  BookingRequestResult,
} from './dto';
import type { BookingRequestInput } from './validation';

// ---------------------------------------------------------------------------
// Booking constants
// ---------------------------------------------------------------------------
// Minimum notice between now and lesson start. Per project rules
// ("8h booking notice"), slots within this window are not bookable.
const MINIMUM_NOTICE_HOURS = 8;

// Request expiry: the tutor has until 2 hours before the scheduled start
// to accept. Matches the payment-scope decision.
const REQUEST_EXPIRY_BUFFER_HOURS = 2;

// Placeholder booking authorization amount for MVP. Tutor-specific structured
// pricing lives in a later task — complex pricing systems are out of scope for
// P1-BOOK-001.
const DEFAULT_BOOKING_AMOUNT = '50.00';
const DEFAULT_CURRENCY_CODE = 'USD';

// ---------------------------------------------------------------------------
// Booking context read
// ---------------------------------------------------------------------------

export async function getBookingContext(
  matchCandidateId: string,
): Promise<BookingContextResult> {
  const state = await resolveAccountState();

  if (state.status === 'unauthenticated') {
    return { status: 'unauthenticated' };
  }

  if (state.status !== 'student_active') {
    return { status: 'forbidden' };
  }

  const studentProfile = await findStudentProfileByAppUserId(state.appUser.id);
  if (!studentProfile) {
    return { status: 'forbidden' };
  }

  const row = await findBookingContextByMatchCandidateId(matchCandidateId);
  if (!row) {
    return { status: 'not_found' };
  }

  // Object-level authorization: the student must own the learning need that
  // produced this match candidate. Unauthorized access returns not_found
  // to avoid revealing whether the private object exists.
  if (row.student_profile_id !== studentProfile.id) {
    return { status: 'not_found' };
  }

  if (row.tutor_listing_status !== 'listed') {
    return { status: 'not_found' };
  }

  const context: BookingContextDto = {
    match_candidate_id: row.match_candidate_id,
    learning_need_id: row.learning_need_id,
    student_profile_id: row.student_profile_id,
    student_timezone:
      row.learning_need_timezone ?? state.appUser.timezone ?? 'UTC',
    tutor: {
      tutor_profile_id: row.tutor_profile_id,
      public_slug: row.tutor_public_slug ?? '',
      display_name: row.tutor_display_name ?? 'Tutor',
      headline: row.tutor_headline,
      pricing_summary: row.tutor_pricing_summary,
    },
    subject_snapshot: row.subject_name,
    focus_snapshot: row.focus_area_name,
    minimum_notice_hours: MINIMUM_NOTICE_HOURS,
    default_price_amount: DEFAULT_BOOKING_AMOUNT,
    default_currency_code: DEFAULT_CURRENCY_CODE,
  };

  return { status: 'found', context };
}

// ---------------------------------------------------------------------------
// Booking request creation (mutation boundary)
// ---------------------------------------------------------------------------

export async function createBookingRequest(
  input: BookingRequestInput,
): Promise<BookingRequestResult> {
  const state = await resolveAccountState();

  if (state.status === 'unauthenticated') {
    return {
      ok: false,
      code: 'unauthenticated',
      message: 'Sign in to request a lesson.',
    };
  }

  if (state.status !== 'student_active') {
    return {
      ok: false,
      code: 'forbidden',
      message: 'Only active students can request lessons.',
    };
  }

  const studentProfile = await findStudentProfileByAppUserId(state.appUser.id);
  if (!studentProfile) {
    return {
      ok: false,
      code: 'forbidden',
      message: 'Student profile not found.',
    };
  }

  const row = await findBookingContextByMatchCandidateId(input.matchCandidateId);
  if (!row) {
    return { ok: false, code: 'not_found', message: 'Match not found.' };
  }

  if (row.student_profile_id !== studentProfile.id) {
    return { ok: false, code: 'not_found', message: 'Match not found.' };
  }

  if (row.tutor_listing_status !== 'listed') {
    return {
      ok: false,
      code: 'not_found',
      message: 'This tutor is no longer accepting booking requests.',
    };
  }

  // Parse the requested start in the submitted timezone, then derive end
  // and expiry in UTC for storage. Always store UTC; display is consumer-side.
  const startLocal = DateTime.fromISO(input.scheduledStartAt, {
    zone: input.timezone,
    setZone: true,
  });

  if (!startLocal.isValid) {
    return {
      ok: false,
      code: 'validation_failed',
      message: 'Invalid start time.',
      fieldErrors: { scheduledStartAt: ['Invalid start time.'] },
    };
  }

  const startUtc = startLocal.toUTC();
  const endUtc = startUtc.plus({ minutes: input.durationMinutes });
  const nowUtc = DateTime.utc();
  const minimumStartUtc = nowUtc.plus({ hours: MINIMUM_NOTICE_HOURS });

  if (startUtc < minimumStartUtc) {
    return {
      ok: false,
      code: 'validation_failed',
      message: `Lessons must start at least ${MINIMUM_NOTICE_HOURS} hours from now.`,
      fieldErrors: {
        scheduledStartAt: [
          `Pick a start time at least ${MINIMUM_NOTICE_HOURS} hours from now.`,
        ],
      },
    };
  }

  const requestExpiresAtUtc = startUtc.minus({
    hours: REQUEST_EXPIRY_BUFFER_HOURS,
  });

  // Persist lesson request and pending payment before calling Stripe, so the
  // durable intent exists regardless of provider outcome.
  const lesson = await insertLessonRequest({
    studentProfileId: studentProfile.id,
    tutorProfileId: row.tutor_profile_id,
    learningNeedId: row.learning_need_id,
    matchCandidateId: row.match_candidate_id,
    scheduledStartAt: startUtc.toJSDate(),
    scheduledEndAt: endUtc.toJSDate(),
    requestExpiresAt: requestExpiresAtUtc.toJSDate(),
    lessonTimezone: input.timezone,
    priceAmount: DEFAULT_BOOKING_AMOUNT,
    currencyCode: DEFAULT_CURRENCY_CODE,
    subjectSnapshot: row.subject_name,
    focusSnapshot: row.focus_area_name,
    studentNoteSnapshot: input.studentNote ?? null,
  });

  await insertLessonStatusHistory({
    lessonId: lesson.id,
    fromStatus: null,
    toStatus: 'requested',
    changedByAppUserId: state.appUser.id,
    changeReason: 'booking_request_created',
  });

  const payment = await insertPendingPayment({
    lessonId: lesson.id,
    payerAppUserId: state.appUser.id,
    amount: DEFAULT_BOOKING_AMOUNT,
    currencyCode: DEFAULT_CURRENCY_CODE,
    stripeCheckoutSessionId: null,
  });

  // Create Stripe Checkout in authorization-only mode. Stripe idempotency
  // key ties outbound retries to this one payment intent.
  const env = getServerEnv();
  const amountMinor = toMinorUnits(DEFAULT_BOOKING_AMOUNT);
  const tutorName = row.tutor_display_name ?? 'Tutor';

  let session;
  try {
    session = await getStripe().checkout.sessions.create(
      {
        mode: 'payment',
        payment_intent_data: {
          capture_method: 'manual',
          metadata: {
            lesson_id: lesson.id,
            payment_id: payment.id,
          },
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: DEFAULT_CURRENCY_CODE.toLowerCase(),
              unit_amount: amountMinor,
              product_data: {
                name: `Lesson with ${tutorName}`,
                description: buildProductDescription(row.subject_name, row.focus_area_name),
              },
            },
          },
        ],
        client_reference_id: state.appUser.id,
        metadata: {
          lesson_id: lesson.id,
          payment_id: payment.id,
          match_candidate_id: row.match_candidate_id,
        },
        success_url: `${env.NEXT_PUBLIC_APP_URL}/lessons?booking=requested&lesson=${lesson.id}`,
        cancel_url: `${env.NEXT_PUBLIC_APP_URL}/book/${row.match_candidate_id}?cancelled=1`,
      },
      {
        idempotencyKey: `booking_checkout:${payment.id}`,
      },
    );
  } catch (err) {
    console.error('[booking] Stripe checkout creation failed:', safeErrorLabel(err));
    return {
      ok: false,
      code: 'provider_unavailable',
      message: 'Could not start payment authorization. Please try again.',
    };
  }

  if (!session.url) {
    console.error('[booking] Stripe checkout returned no URL');
    return {
      ok: false,
      code: 'provider_unavailable',
      message: 'Could not start payment authorization. Please try again.',
    };
  }

  await attachCheckoutSessionToPayment(payment.id, session.id);

  return {
    ok: true,
    lesson_id: lesson.id,
    checkout_url: session.url,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toMinorUnits(amount: string): number {
  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error('Invalid booking amount');
  }
  return Math.round(num * 100);
}

function buildProductDescription(
  subjectName: string | null,
  focusAreaName: string | null,
): string {
  const parts: string[] = [site.name];
  if (subjectName) parts.push(subjectName);
  if (focusAreaName) parts.push(focusAreaName);
  return parts.join(' • ');
}

function safeErrorLabel(err: unknown): string {
  if (err instanceof Error) return err.name;
  return 'UnknownError';
}
