/**
 * Canonical notification-type identifiers used across the notifications module.
 * Kept here (not in emit.ts) so peripheral files — email templates, channel
 * policy, tests — can import them without pulling in the emit side-effect code
 * path and forming a dependency cycle.
 */
export const NOTIFICATION_TYPES = {
  LESSON_REQUEST_SUBMITTED: 'lesson_request_submitted',
  LESSON_ACCEPTED: 'lesson_accepted',
  LESSON_DECLINED: 'lesson_declined',
  LESSON_EXPIRED: 'lesson_expired',
  LESSON_CANCELLED: 'lesson_cancelled',
  LESSON_RESCHEDULED: 'lesson_rescheduled',
  LESSON_REMINDER: 'lesson_reminder',
  LESSON_ISSUE_ACKNOWLEDGED: 'lesson_issue_acknowledged',
  LESSON_ISSUE_RESOLVED: 'lesson_issue_resolved',
  PAYOUT_READY: 'payout_ready',
  PAYOUT_HOLD: 'payout_hold',
  LEGAL_UPDATE: 'legal_update',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
