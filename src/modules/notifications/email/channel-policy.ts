import { NOTIFICATION_TYPES } from '../types';

/**
 * Which in-app notification types also fan out to email in MVP.
 *
 * Per architecture §8.5: lesson lifecycle, tutor application, payout, and
 * legal-update notifications send both in-app and email. Chat-message alerts
 * intentionally stay in-app only.
 */
const EMAIL_ELIGIBLE_TYPES = new Set<string>([
  NOTIFICATION_TYPES.LESSON_REQUEST_SUBMITTED,
  NOTIFICATION_TYPES.LESSON_ACCEPTED,
  NOTIFICATION_TYPES.LESSON_DECLINED,
  NOTIFICATION_TYPES.LESSON_EXPIRED,
  NOTIFICATION_TYPES.LESSON_CANCELLED,
  NOTIFICATION_TYPES.LESSON_RESCHEDULED,
  NOTIFICATION_TYPES.LESSON_REMINDER,
  NOTIFICATION_TYPES.LESSON_ISSUE_ACKNOWLEDGED,
  NOTIFICATION_TYPES.LESSON_ISSUE_RESOLVED,
  NOTIFICATION_TYPES.PAYOUT_READY,
  NOTIFICATION_TYPES.PAYOUT_HOLD,
  NOTIFICATION_TYPES.LEGAL_UPDATE,
]);

export function shouldSendEmail(notificationType: string): boolean {
  return EMAIL_ELIGIBLE_TYPES.has(notificationType);
}
