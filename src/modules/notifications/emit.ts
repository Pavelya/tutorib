import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { appUsers } from '@/modules/accounts/schema';
import { dispatchJob } from '@/modules/jobs/service';
import {
  insertNotification,
  insertNotificationDelivery,
  type InsertNotificationInput,
} from './repository';
import { shouldSendEmail } from './email/channel-policy';
import {
  EMAIL_CHANNEL,
  JOB_TYPE_SEND_TRANSACTIONAL_EMAIL,
} from './email/constants';
import { NOTIFICATION_TYPES } from './types';
export { NOTIFICATION_TYPES } from './types';

/**
 * Notification emission boundary.
 *
 * Domain modules call these functions after their canonical mutation succeeds
 * so in-app notifications are generated consistently. In-app notification state
 * is the canonical product-notification record (architecture §8.3); email and
 * other channels are added later as separate delivery concerns.
 *
 * Chat-message alerts are intentionally not emitted here — they live in the
 * conversations module and stay in-app only (architecture §8.5).
 */

const OBJECT_TYPE_LESSON = 'lesson';
const OBJECT_TYPE_LESSON_ISSUE = 'lesson_issue_case';
const OBJECT_TYPE_PAYOUT = 'payout';
const OBJECT_TYPE_POLICY_NOTICE = 'policy_notice_version';

/**
 * Insert the canonical in-app notification and fan out to secondary channels
 * that the MVP channel policy requires (architecture §8.5). Email delivery is
 * scheduled through the durable job system so retries and observability stay
 * at the approved notification-delivery boundary.
 */
async function emitNotification(
  input: InsertNotificationInput,
): Promise<void> {
  const notification = await insertNotification(input);

  if (!shouldSendEmail(input.notificationType)) return;

  const delivery = await insertNotificationDelivery({
    notificationId: notification.id,
    channel: EMAIL_CHANNEL,
  });

  await dispatchJob({
    job_type: JOB_TYPE_SEND_TRANSACTIONAL_EMAIL,
    idempotency_key: `email:${delivery.id}`,
    trigger_object_type: 'notification_delivery',
    trigger_object_id: delivery.id,
    payload: { deliveryId: delivery.id },
  });
}

export interface EmitLessonRequestSubmittedInput {
  lessonId: string;
  tutorAppUserId: string;
  studentDisplayName: string | null;
  subjectSnapshot: string | null;
  scheduledStartAt: Date;
}

/**
 * Lesson request created by a student — notify the tutor so they can act.
 */
export async function emitLessonRequestSubmitted(
  input: EmitLessonRequestSubmittedInput,
): Promise<void> {
  const studentLabel = input.studentDisplayName?.trim() || 'A student';
  const subject = input.subjectSnapshot ?? 'lesson';
  await emitNotification({
    appUserId: input.tutorAppUserId,
    notificationType: NOTIFICATION_TYPES.LESSON_REQUEST_SUBMITTED,
    title: `New ${subject} request`,
    bodySummary: `${studentLabel} requested a lesson. Review and respond before the request expires.`,
    objectType: OBJECT_TYPE_LESSON,
    objectId: input.lessonId,
  });
}

export interface EmitLessonLifecycleInput {
  lessonId: string;
  recipientAppUserId: string;
  subjectSnapshot: string | null;
  scheduledStartAt: Date;
}

/**
 * Tutor accepted a request — notify the student that their lesson is confirmed.
 */
export async function emitLessonAccepted(
  input: EmitLessonLifecycleInput,
): Promise<void> {
  const subject = input.subjectSnapshot ?? 'lesson';
  await emitNotification({
    appUserId: input.recipientAppUserId,
    notificationType: NOTIFICATION_TYPES.LESSON_ACCEPTED,
    title: `Your ${subject} is confirmed`,
    bodySummary:
      'Your tutor accepted the request and payment is captured. See the lesson details to prepare.',
    objectType: OBJECT_TYPE_LESSON,
    objectId: input.lessonId,
  });
}

/**
 * Tutor declined a request — notify the student and release authorization.
 */
export async function emitLessonDeclined(
  input: EmitLessonLifecycleInput,
): Promise<void> {
  const subject = input.subjectSnapshot ?? 'lesson';
  await emitNotification({
    appUserId: input.recipientAppUserId,
    notificationType: NOTIFICATION_TYPES.LESSON_DECLINED,
    title: `${subject} request declined`,
    bodySummary:
      'The tutor declined this request. The payment authorization is released — you can request another time.',
    objectType: OBJECT_TYPE_LESSON,
    objectId: input.lessonId,
  });
}

/**
 * Request expired without a tutor response — notify both participants.
 */
export async function emitLessonExpired(
  input: EmitLessonLifecycleInput,
): Promise<void> {
  const subject = input.subjectSnapshot ?? 'lesson';
  await emitNotification({
    appUserId: input.recipientAppUserId,
    notificationType: NOTIFICATION_TYPES.LESSON_EXPIRED,
    title: `${subject} request expired`,
    bodySummary: 'The request expired before it was accepted. No charge was made.',
    objectType: OBJECT_TYPE_LESSON,
    objectId: input.lessonId,
  });
}

/**
 * Lesson cancelled by either side — notify the other participant.
 */
export async function emitLessonCancelled(
  input: EmitLessonLifecycleInput,
): Promise<void> {
  const subject = input.subjectSnapshot ?? 'lesson';
  await emitNotification({
    appUserId: input.recipientAppUserId,
    notificationType: NOTIFICATION_TYPES.LESSON_CANCELLED,
    title: `${subject} cancelled`,
    bodySummary: 'This lesson was cancelled. Open the lesson for details.',
    objectType: OBJECT_TYPE_LESSON,
    objectId: input.lessonId,
  });
}

/**
 * Lesson time changed by either side — notify the other participant.
 */
export async function emitLessonRescheduled(
  input: EmitLessonLifecycleInput,
): Promise<void> {
  const subject = input.subjectSnapshot ?? 'lesson';
  await emitNotification({
    appUserId: input.recipientAppUserId,
    notificationType: NOTIFICATION_TYPES.LESSON_RESCHEDULED,
    title: `${subject} rescheduled`,
    bodySummary: 'The lesson time has changed. Open the lesson for the new schedule.',
    objectType: OBJECT_TYPE_LESSON,
    objectId: input.lessonId,
  });
}

/**
 * Upcoming-lesson reminder — generated by a scheduled runner.
 */
export async function emitLessonReminder(
  input: EmitLessonLifecycleInput,
): Promise<void> {
  const subject = input.subjectSnapshot ?? 'lesson';
  await emitNotification({
    appUserId: input.recipientAppUserId,
    notificationType: NOTIFICATION_TYPES.LESSON_REMINDER,
    title: `Upcoming ${subject}`,
    bodySummary: 'Your lesson is coming up soon. Open the meeting link from the lesson page.',
    objectType: OBJECT_TYPE_LESSON,
    objectId: input.lessonId,
  });
}

export interface EmitLessonIssueInput {
  lessonIssueCaseId: string;
  recipientAppUserId: string;
}

/**
 * A lesson issue was accepted into the queue — acknowledge receipt to the reporter.
 */
export async function emitLessonIssueAcknowledged(
  input: EmitLessonIssueInput,
): Promise<void> {
  await emitNotification({
    appUserId: input.recipientAppUserId,
    notificationType: NOTIFICATION_TYPES.LESSON_ISSUE_ACKNOWLEDGED,
    title: 'We received your issue report',
    bodySummary:
      'Our team is reviewing the lesson issue you reported. We will follow up with an outcome.',
    objectType: OBJECT_TYPE_LESSON_ISSUE,
    objectId: input.lessonIssueCaseId,
  });
}

export interface EmitLessonIssueResolvedInput extends EmitLessonIssueInput {
  resolutionOutcome: string | null;
}

/**
 * A lesson issue was resolved — notify the reporter of the outcome.
 */
export async function emitLessonIssueResolved(
  input: EmitLessonIssueResolvedInput,
): Promise<void> {
  await emitNotification({
    appUserId: input.recipientAppUserId,
    notificationType: NOTIFICATION_TYPES.LESSON_ISSUE_RESOLVED,
    title: 'Lesson issue resolved',
    bodySummary: input.resolutionOutcome
      ? `The team resolved your report: ${input.resolutionOutcome}.`
      : 'The team resolved your report. Open the lesson for the outcome.',
    objectType: OBJECT_TYPE_LESSON_ISSUE,
    objectId: input.lessonIssueCaseId,
  });
}

export interface EmitPayoutInput {
  tutorAppUserId: string;
  payoutId: string | null;
}

/**
 * Tutor payout is ready for withdrawal.
 */
export async function emitPayoutReady(input: EmitPayoutInput): Promise<void> {
  await emitNotification({
    appUserId: input.tutorAppUserId,
    notificationType: NOTIFICATION_TYPES.PAYOUT_READY,
    title: 'Payout ready',
    bodySummary: 'A payout is ready on your Earnings page.',
    objectType: OBJECT_TYPE_PAYOUT,
    objectId: input.payoutId,
  });
}

export interface EmitPayoutHoldInput extends EmitPayoutInput {
  holdReason: string | null;
}

/**
 * Tutor payout is on hold and needs attention.
 */
export async function emitPayoutHold(input: EmitPayoutHoldInput): Promise<void> {
  await emitNotification({
    appUserId: input.tutorAppUserId,
    notificationType: NOTIFICATION_TYPES.PAYOUT_HOLD,
    title: 'Payout on hold',
    bodySummary: input.holdReason
      ? `A payout is on hold: ${input.holdReason}. Review your Earnings page.`
      : 'A payout is on hold. Review your Earnings page for next steps.',
    objectType: OBJECT_TYPE_PAYOUT,
    objectId: input.payoutId,
  });
}

export interface EmitLegalUpdateInput {
  policyNoticeVersionId: string;
  title: string;
  summary: string | null;
}

/**
 * Broadcast a legal-update (terms, privacy) notification to every active app user.
 * Paired with the post-login legal-notice trigger so updates are visible both at
 * login and later in /notifications (architecture §8.9).
 */
export async function emitLegalUpdatePublishedToAllUsers(
  input: EmitLegalUpdateInput,
): Promise<void> {
  const db = getDb();
  const users = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(eq(appUsers.account_status, 'active'));

  if (users.length === 0) return;

  await Promise.all(
    users.map((u) =>
      emitNotification({
        appUserId: u.id,
        notificationType: NOTIFICATION_TYPES.LEGAL_UPDATE,
        title: input.title,
        bodySummary: input.summary,
        objectType: OBJECT_TYPE_POLICY_NOTICE,
        objectId: input.policyNoticeVersionId,
      }),
    ),
  );
}
