'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  bookingRequestSchema,
  cancelLessonSchema,
  reportLessonIssueSchema,
} from './validation';
import {
  cancelLessonAsStudent,
  createBookingRequest,
  reportLessonIssueAsStudent,
} from './service';
import type { BookingRequestResult } from './dto';

export type BookingRequestActionResult =
  | { ok: true; lessonId: string; checkoutUrl: string }
  | {
      ok: false;
      code: string;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export async function createBookingRequestAction(
  _prevState: BookingRequestActionResult | null,
  formData: FormData,
): Promise<BookingRequestActionResult> {
  const raw = {
    matchCandidateId: formData.get('matchCandidateId'),
    scheduledStartAt: formData.get('scheduledStartAt'),
    durationMinutes: formData.get('durationMinutes'),
    timezone: formData.get('timezone'),
    studentNote: formData.get('studentNote') || undefined,
  };

  const parsed = bookingRequestSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return {
      ok: false,
      code: 'validation_failed',
      message: 'Please correct the highlighted fields.',
      fieldErrors,
    };
  }

  const result: BookingRequestResult = await createBookingRequest(parsed.data);

  if (!result.ok) {
    return {
      ok: false,
      code: result.code,
      message: result.message,
      fieldErrors: result.fieldErrors,
    };
  }

  // Cache invalidation: lessons surface shows new booking requests once the
  // authorization completes. Revalidate the list so the student lands on a
  // fresh view when they return from Stripe.
  revalidatePath('/lessons');

  // External redirect to Stripe Checkout for authorization-only confirmation.
  redirect(result.checkout_url);
}

// ---------------------------------------------------------------------------
// Student lesson cancellation
// ---------------------------------------------------------------------------

export type CancelLessonActionResult =
  | { ok: true; refundPosture: 'full_refund' | 'no_refund' | 'authorization_released' }
  | { ok: false; code: string; message: string };

export async function cancelLessonAction(
  _prevState: CancelLessonActionResult | null,
  formData: FormData,
): Promise<CancelLessonActionResult> {
  const parsed = cancelLessonSchema.safeParse({
    lessonId: formData.get('lessonId'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: 'validation_failed',
      message: 'Invalid cancellation request.',
    };
  }

  const result = await cancelLessonAsStudent(parsed.data);

  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }

  revalidatePath('/lessons');
  revalidatePath(`/lessons/${parsed.data.lessonId}`);
  revalidatePath('/notifications');

  return { ok: true, refundPosture: result.refund_posture };
}

// ---------------------------------------------------------------------------
// Student lesson-issue report
// ---------------------------------------------------------------------------

export type ReportLessonIssueActionResult =
  | { ok: true; caseId: string }
  | {
      ok: false;
      code: string;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export async function reportLessonIssueAction(
  _prevState: ReportLessonIssueActionResult | null,
  formData: FormData,
): Promise<ReportLessonIssueActionResult> {
  const parsed = reportLessonIssueSchema.safeParse({
    lessonId: formData.get('lessonId'),
    reason: formData.get('reason'),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return {
      ok: false,
      code: 'validation_failed',
      message: 'Select a reason before submitting.',
      fieldErrors,
    };
  }

  const result = await reportLessonIssueAsStudent(parsed.data);

  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }

  revalidatePath(`/lessons/${parsed.data.lessonId}`);
  revalidatePath('/notifications');

  return { ok: true, caseId: result.case_id };
}
