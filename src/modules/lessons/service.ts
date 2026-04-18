import { DateTime } from 'luxon';
import { resolveAccountState } from '@/modules/accounts/service';
import { findStudentProfileByAppUserId } from '@/modules/learning-needs/repository';
import { getStripe } from '@/lib/stripe/client';
import { getServerEnv } from '@/lib/env/server';
import { site } from '@/lib/config/site';
import {
  findBookingContextByMatchCandidateId,
  findLessonCalendarForParticipant,
  findLessonDetailForStudent,
  findLessonsForStudent,
  findOpenLessonIssueCase,
  insertLessonRequest,
  insertLessonStatusHistory,
  insertStudentLessonIssueCase,
  markLessonCancelled,
  markPaymentCancelled,
  markPaymentRefunded,
  type LessonCalendarRow,
  type StudentLessonDetailRow,
  type StudentLessonListRow,
} from './repository';
import {
  insertPendingPayment,
  attachCheckoutSessionToPayment,
} from '@/modules/payments/repository';
import {
  emitLessonCancelled,
  emitLessonIssueAcknowledged,
  emitLessonRequestSubmitted,
} from '@/modules/notifications/emit';
import type {
  BookingContextDto,
  BookingContextResult,
  BookingRequestResult,
  CancelLessonResult,
  LessonCancellationPolicyDto,
  LessonIssueStatusDto,
  LessonMeetingAccessDto,
  LessonTutorSummaryDto,
  ReportLessonIssueResult,
  StudentLessonCardDto,
  StudentLessonDetailDto,
  StudentLessonDetailResult,
  StudentLessonListResult,
  StudentLessonState,
} from './dto';
import type {
  BookingRequestInput,
  CancelLessonInput,
  ReportLessonIssueInput,
} from './validation';

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

  // Notify the tutor that a request is waiting for their response. Emission
  // failure must not block the booking return — the durable lesson row is the
  // source of truth and a scheduled sweep can reconcile notifications later.
  try {
    await emitLessonRequestSubmitted({
      lessonId: lesson.id,
      tutorAppUserId: row.tutor_app_user_id,
      studentDisplayName: state.appUser.full_name ?? null,
      subjectSnapshot: row.subject_name,
      scheduledStartAt: startUtc.toJSDate(),
    });
  } catch (err) {
    console.error('[booking] notification emit failed:', safeErrorLabel(err));
  }

  return {
    ok: true,
    lesson_id: lesson.id,
    checkout_url: session.url,
  };
}

// ---------------------------------------------------------------------------
// Student lesson list + detail (participant-scoped D4/D6)
// ---------------------------------------------------------------------------

// Per the lesson-issue-and-dispute model §6.1, a lesson issue can be reported
// from scheduled_start_at until 24 hours after scheduled_end_at.
const ISSUE_REPORTING_WINDOW_HOURS_AFTER_END = 24;

// Per the platform cancellation policy (lesson-issue-and-dispute model §5.1),
// student cancellations >= 2h before lesson start receive a full refund; later
// cancellations are non-refundable. Requests that are still pending tutor
// acceptance simply release the held Stripe authorization.
const STUDENT_CANCELLATION_POLICY_NOTICE_HOURS = 2;

export async function getStudentLessons(): Promise<StudentLessonListResult> {
  const state = await resolveAccountState();
  if (state.status === 'unauthenticated') return { status: 'unauthenticated' };
  if (state.status !== 'student_active') return { status: 'forbidden' };

  const studentProfile = await findStudentProfileByAppUserId(state.appUser.id);
  if (!studentProfile) return { status: 'forbidden' };

  const rows = await findLessonsForStudent(studentProfile.id);
  const now = DateTime.utc();
  const lessons = rows.map((r) => toStudentLessonCardDto(r, now));
  return { status: 'ok', lessons };
}

export async function getStudentLessonDetail(
  lessonId: string,
): Promise<StudentLessonDetailResult> {
  const state = await resolveAccountState();
  if (state.status === 'unauthenticated') return { status: 'unauthenticated' };
  if (state.status !== 'student_active') return { status: 'forbidden' };

  const studentProfile = await findStudentProfileByAppUserId(state.appUser.id);
  if (!studentProfile) return { status: 'forbidden' };

  const row = await findLessonDetailForStudent(lessonId, studentProfile.id);
  if (!row) return { status: 'not_found' };

  const now = DateTime.utc();
  return { status: 'ok', lesson: toStudentLessonDetailDto(row, now) };
}

// ---------------------------------------------------------------------------
// DTO shaping helpers
// ---------------------------------------------------------------------------

function toStudentLessonCardDto(
  row: StudentLessonListRow,
  now: DateTime,
): StudentLessonCardDto {
  return {
    lesson_id: row.lesson_id,
    lesson_state: normalizeLessonState(row, now),
    scheduled_start_at: row.scheduled_start_at.toISOString(),
    scheduled_end_at: row.scheduled_end_at.toISOString(),
    lesson_timezone: row.lesson_timezone,
    subject_snapshot: row.subject_snapshot,
    focus_snapshot: row.focus_snapshot,
    price_amount: row.price_amount,
    currency_code: row.currency_code,
    tutor: toLessonTutorDto(row),
    has_open_issue: row.has_open_issue,
  };
}

function toStudentLessonDetailDto(
  row: StudentLessonDetailRow,
  now: DateTime,
): StudentLessonDetailDto {
  const lessonState = normalizeLessonState(row, now);
  return {
    lesson_id: row.lesson_id,
    lesson_state: lessonState,
    scheduled_start_at: row.scheduled_start_at.toISOString(),
    scheduled_end_at: row.scheduled_end_at.toISOString(),
    request_expires_at: row.request_expires_at
      ? row.request_expires_at.toISOString()
      : null,
    lesson_timezone: row.lesson_timezone,
    subject_snapshot: row.subject_snapshot,
    focus_snapshot: row.focus_snapshot,
    student_note_snapshot: row.student_note_snapshot,
    price_amount: row.price_amount,
    currency_code: row.currency_code,
    tutor: toLessonTutorDto(row),
    is_issue_reportable: canReportIssue(row, lessonState, now),
    issue: toIssueStatusDto(row),
    meeting_access: toMeetingAccessDto(row, lessonState),
    cancellation_policy: toCancellationPolicyDto(row, lessonState, now),
  };
}

function toMeetingAccessDto(
  row: StudentLessonDetailRow,
  state: StudentLessonState,
): LessonMeetingAccessDto | null {
  // Meeting access is participant-private and only meaningful for
  // upcoming/completed lessons (§10.3 missing-link rule). Declined/cancelled/
  // expired lessons never expose meeting URLs even if one was recorded.
  if (state !== 'upcoming' && state !== 'completed') return null;
  if (!row.meeting_provider) return null;
  return {
    provider: row.meeting_provider,
    provider_label: meetingProviderLabel(row.meeting_provider),
    join_url: row.meeting_url,
    access_status: normalizeMeetingAccessStatus(row.meeting_access_status),
  };
}

function meetingProviderLabel(provider: string): string {
  switch (provider) {
    case 'google_meet':
      return 'Google Meet';
    case 'zoom':
      return 'Zoom';
    case 'microsoft_teams':
      return 'Microsoft Teams';
    case 'whereby':
      return 'Whereby';
    case 'generic':
      return 'External meeting';
    default:
      return 'External meeting';
  }
}

function normalizeMeetingAccessStatus(
  value: string | null,
): LessonMeetingAccessDto['access_status'] {
  if (value === 'active' || value === 'pending' || value === 'inactive') {
    return value;
  }
  return 'pending';
}

function toCancellationPolicyDto(
  row: StudentLessonDetailRow,
  state: StudentLessonState,
  now: DateTime,
): LessonCancellationPolicyDto {
  const start = DateTime.fromJSDate(row.scheduled_start_at);
  const hoursUntilStart = state === 'requested' || state === 'upcoming'
    ? start.diff(now, 'hours').hours
    : null;

  if (state === 'requested') {
    return {
      can_cancel: true,
      refund_posture: 'authorization_released',
      hours_until_start: hoursUntilStart,
      policy_notice_hours: STUDENT_CANCELLATION_POLICY_NOTICE_HOURS,
    };
  }

  if (state === 'upcoming') {
    const refundPosture =
      hoursUntilStart !== null &&
      hoursUntilStart >= STUDENT_CANCELLATION_POLICY_NOTICE_HOURS
        ? 'full_refund'
        : 'no_refund';
    return {
      can_cancel: true,
      refund_posture: refundPosture,
      hours_until_start: hoursUntilStart,
      policy_notice_hours: STUDENT_CANCELLATION_POLICY_NOTICE_HOURS,
    };
  }

  return {
    can_cancel: false,
    refund_posture: 'none',
    hours_until_start: null,
    policy_notice_hours: STUDENT_CANCELLATION_POLICY_NOTICE_HOURS,
  };
}

function toLessonTutorDto(
  row: Pick<
    StudentLessonListRow,
    | 'tutor_profile_id'
    | 'tutor_public_slug'
    | 'tutor_display_name'
    | 'tutor_headline'
    | 'tutor_avatar_url'
  >,
): LessonTutorSummaryDto {
  return {
    tutor_profile_id: row.tutor_profile_id,
    public_slug: row.tutor_public_slug,
    display_name: row.tutor_display_name ?? 'Tutor',
    headline: row.tutor_headline,
    avatar_url: row.tutor_avatar_url,
  };
}

function toIssueStatusDto(
  row: StudentLessonDetailRow,
): LessonIssueStatusDto | null {
  if (!row.issue_case_id || !row.issue_case_status) return null;
  return {
    case_id: row.issue_case_id,
    case_status: normalizeIssueCaseStatus(row.issue_case_status),
    resolution_outcome: row.issue_resolution_outcome,
    reported_at: row.issue_reported_at
      ? row.issue_reported_at.toISOString()
      : null,
  };
}

function normalizeLessonState(
  row: Pick<
    StudentLessonListRow,
    'lesson_status' | 'scheduled_end_at' | 'request_expires_at'
  >,
  now: DateTime,
): StudentLessonState {
  const status = row.lesson_status;
  if (status === 'declined') return 'declined';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed') return 'completed';
  if (status === 'requested') {
    if (row.request_expires_at && DateTime.fromJSDate(row.request_expires_at) < now) {
      return 'expired';
    }
    return 'requested';
  }
  if (status === 'accepted') {
    const end = DateTime.fromJSDate(row.scheduled_end_at);
    return end < now ? 'completed' : 'upcoming';
  }
  return 'requested';
}

function normalizeIssueCaseStatus(
  value: string,
): LessonIssueStatusDto['case_status'] {
  if (
    value === 'open' ||
    value === 'under_review' ||
    value === 'resolved' ||
    value === 'dismissed'
  ) {
    return value;
  }
  return 'open';
}

function canReportIssue(
  row: Pick<StudentLessonDetailRow, 'scheduled_start_at' | 'scheduled_end_at'>,
  state: StudentLessonState,
  now: DateTime,
): boolean {
  // Only upcoming/completed lessons (i.e., the lesson actually happened or
  // was supposed to happen) have a reportable window. Declined/cancelled/
  // expired/requested states do not surface the issue entry.
  if (state !== 'upcoming' && state !== 'completed') return false;
  const start = DateTime.fromJSDate(row.scheduled_start_at);
  const end = DateTime.fromJSDate(row.scheduled_end_at);
  if (now < start) return false;
  const windowClosesAt = end.plus({ hours: ISSUE_REPORTING_WINDOW_HOURS_AFTER_END });
  return now <= windowClosesAt;
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

// ---------------------------------------------------------------------------
// Student cancellation (participant action)
// ---------------------------------------------------------------------------

export async function cancelLessonAsStudent(
  input: CancelLessonInput,
): Promise<CancelLessonResult> {
  const state = await resolveAccountState();
  if (state.status === 'unauthenticated') {
    return {
      ok: false,
      code: 'unauthenticated',
      message: 'Sign in to cancel a lesson.',
    };
  }
  if (state.status !== 'student_active') {
    return {
      ok: false,
      code: 'forbidden',
      message: 'Only students can cancel their booked lessons here.',
    };
  }

  const studentProfile = await findStudentProfileByAppUserId(state.appUser.id);
  if (!studentProfile) {
    return { ok: false, code: 'forbidden', message: 'Student profile not found.' };
  }

  const row = await findLessonDetailForStudent(input.lessonId, studentProfile.id);
  if (!row) {
    return { ok: false, code: 'not_found', message: 'Lesson not found.' };
  }

  const now = DateTime.utc();
  const lessonState = normalizeLessonState(row, now);

  if (lessonState !== 'requested' && lessonState !== 'upcoming') {
    return {
      ok: false,
      code: 'invalid_state',
      message: 'This lesson can no longer be cancelled.',
    };
  }

  const policy = toCancellationPolicyDto(row, lessonState, now);
  const fromStatus = row.lesson_status;
  const cancelledAt = new Date();

  // Payment action depends on the current authorization/capture posture. For
  // requested or still-authorized lessons we cancel the PaymentIntent to
  // release the hold; for captured lessons we refund when the policy grants
  // a refund. Stripe errors do not block the lesson-state change — they are
  // logged and reconciled by the payment-sweep job.
  const stripeStripeClient = getStripe();
  if (row.payment_id && row.payment_intent_id) {
    try {
      if (row.payment_status === 'authorized' || row.payment_status === 'pending') {
        await stripeStripeClient.paymentIntents.cancel(row.payment_intent_id);
        await markPaymentCancelled(row.payment_id);
      } else if (
        row.payment_status === 'captured' &&
        policy.refund_posture === 'full_refund'
      ) {
        await stripeStripeClient.refunds.create({
          payment_intent: row.payment_intent_id,
        });
        await markPaymentRefunded(row.payment_id);
      }
    } catch (err) {
      console.error(
        '[lesson-cancel] Stripe release/refund failed:',
        safeErrorLabel(err),
      );
      return {
        ok: false,
        code: 'provider_unavailable',
        message:
          'Could not contact the payment provider. Please try again in a moment.',
      };
    }
  }

  await markLessonCancelled({
    lessonId: input.lessonId,
    cancelledByAppUserId: state.appUser.id,
    cancelledAt,
    fromStatus,
  });

  await insertLessonStatusHistory({
    lessonId: input.lessonId,
    fromStatus,
    toStatus: 'cancelled',
    changedByAppUserId: state.appUser.id,
    changeReason: 'student_cancelled',
  });

  try {
    await emitLessonCancelled({
      lessonId: input.lessonId,
      recipientAppUserId: row.tutor_app_user_id,
      subjectSnapshot: row.subject_snapshot,
      scheduledStartAt: row.scheduled_start_at,
    });
  } catch (err) {
    console.error('[lesson-cancel] notify tutor failed:', safeErrorLabel(err));
  }

  return {
    ok: true,
    lesson_id: input.lessonId,
    refund_posture:
      policy.refund_posture === 'none' ? 'no_refund' : policy.refund_posture,
  };
}

// ---------------------------------------------------------------------------
// Student lesson-issue report (participant action)
// ---------------------------------------------------------------------------

export async function reportLessonIssueAsStudent(
  input: ReportLessonIssueInput,
): Promise<ReportLessonIssueResult> {
  const state = await resolveAccountState();
  if (state.status === 'unauthenticated') {
    return {
      ok: false,
      code: 'unauthenticated',
      message: 'Sign in to report an issue.',
    };
  }
  if (state.status !== 'student_active') {
    return {
      ok: false,
      code: 'forbidden',
      message: 'Only the lesson participant can report an issue here.',
    };
  }

  const studentProfile = await findStudentProfileByAppUserId(state.appUser.id);
  if (!studentProfile) {
    return { ok: false, code: 'forbidden', message: 'Student profile not found.' };
  }

  const row = await findLessonDetailForStudent(input.lessonId, studentProfile.id);
  if (!row) {
    return { ok: false, code: 'not_found', message: 'Lesson not found.' };
  }

  const now = DateTime.utc();
  const lessonState = normalizeLessonState(row, now);

  if (!canReportIssue(row, lessonState, now)) {
    return {
      ok: false,
      code: 'window_closed',
      message:
        'Issue reporting is available from the lesson start time until 24 hours after the scheduled end.',
    };
  }

  const existing = await findOpenLessonIssueCase(input.lessonId);
  if (existing) {
    return {
      ok: false,
      code: 'already_reported',
      message: 'An issue has already been reported for this lesson.',
    };
  }

  const inserted = await insertStudentLessonIssueCase({
    lessonId: input.lessonId,
    studentClaimType: input.reason,
    studentReportedAt: now.toJSDate(),
  });

  try {
    await emitLessonIssueAcknowledged({
      lessonIssueCaseId: inserted.id,
      recipientAppUserId: state.appUser.id,
    });
  } catch (err) {
    console.error(
      '[lesson-issue] acknowledgement notify failed:',
      safeErrorLabel(err),
    );
  }

  return { ok: true, case_id: inserted.id };
}

// ---------------------------------------------------------------------------
// Lesson calendar export (`.ics` and Google Calendar deep link)
// ---------------------------------------------------------------------------

export type LessonCalendarResult =
  | {
      status: 'ok';
      filename: string;
      ics: string;
    }
  | { status: 'unauthenticated' }
  | { status: 'not_found' };

export async function getLessonIcsForParticipant(
  lessonId: string,
): Promise<LessonCalendarResult> {
  const state = await resolveAccountState();
  if (state.status === 'unauthenticated') return { status: 'unauthenticated' };
  if (
    state.status !== 'student_active' &&
    state.status !== 'tutor_active' &&
    state.status !== 'tutor_pending_review'
  ) {
    return { status: 'not_found' };
  }

  const row = await findLessonCalendarForParticipant(lessonId, state.appUser.id);
  if (!row) return { status: 'not_found' };

  // Declined/cancelled/expired lessons should not offer a calendar event —
  // the lesson will not happen. Return not_found so the link is inert.
  if (
    row.lesson_status === 'declined' ||
    row.lesson_status === 'cancelled'
  ) {
    return { status: 'not_found' };
  }

  const ics = buildLessonIcs(row, state.appUser.id);
  const filename = `mentorib-lesson-${lessonId}.ics`;
  return { status: 'ok', filename, ics };
}

/**
 * Build an RFC 5545 iCalendar payload for a lesson. Uses UTC timestamps so
 * the event renders consistently across Apple Calendar, Google Calendar, and
 * Outlook. The description includes participant-private meeting access only
 * when the access is active — otherwise it points back to the lesson surface.
 */
function buildLessonIcs(row: LessonCalendarRow, userAppUserId: string): string {
  const dtStart = formatIcsUtc(row.scheduled_start_at);
  const dtEnd = formatIcsUtc(row.scheduled_end_at);
  const dtStamp = formatIcsUtc(new Date());
  const subjectLabel = row.subject_snapshot ?? 'lesson';
  const tutorLabel = row.tutor_display_name ?? 'your tutor';
  const summary = `${site.name} lesson: ${subjectLabel} with ${tutorLabel}`;

  const descriptionParts: string[] = [];
  descriptionParts.push(
    `Scheduled ${subjectLabel} session with ${tutorLabel} on ${site.name}.`,
  );
  if (row.focus_snapshot) {
    descriptionParts.push(`Focus: ${row.focus_snapshot}.`);
  }
  if (
    row.meeting_url &&
    row.meeting_access_status === 'active'
  ) {
    descriptionParts.push(`Join link: ${row.meeting_url}`);
  } else {
    descriptionParts.push(
      `Join link will appear on ${site.url}/lessons/${row.lesson_id}.`,
    );
  }

  const description = descriptionParts.join('\\n');

  // Stable UID per lesson + consumer so calendar clients update instead of
  // duplicating if the event is re-imported.
  const uid = `lesson-${row.lesson_id}-${userAppUserId}@${site.domain}`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${site.name}//Lessons//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `URL:${site.url}/lessons/${row.lesson_id}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n') + '\r\n';
}

function formatIcsUtc(date: Date): string {
  return DateTime.fromJSDate(date).toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * Build a Google Calendar "template" deep link per Google's public event
 * creation URL. Pure function — no OAuth required.
 */
export function buildGoogleCalendarLink(input: {
  lessonId: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  subjectSnapshot: string | null;
  focusSnapshot: string | null;
  tutorDisplayName: string;
  meetingUrl: string | null;
}): string {
  const subjectLabel = input.subjectSnapshot ?? 'lesson';
  const text = `${site.name} lesson: ${subjectLabel} with ${input.tutorDisplayName}`;
  const detailsParts = [
    `Scheduled ${subjectLabel} session on ${site.name}.`,
  ];
  if (input.focusSnapshot) detailsParts.push(`Focus: ${input.focusSnapshot}.`);
  detailsParts.push(
    input.meetingUrl
      ? `Join link: ${input.meetingUrl}`
      : `Join link will appear on ${site.url}/lessons/${input.lessonId}.`,
  );
  const dates = `${toGcalDate(input.scheduledStartAt)}/${toGcalDate(
    input.scheduledEndAt,
  )}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text,
    dates,
    details: detailsParts.join('\n'),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function toGcalDate(iso: string): string {
  return DateTime.fromISO(iso).toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
}
