import {
  findNotificationsByUser,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  findPendingPolicyNotices,
  recordPolicyNoticeViewed,
  recordPolicyNoticeAcknowledged,
} from './repository';
import type {
  NotificationDto,
  NotificationListDto,
  PendingLegalNoticeDto,
} from './dto';

/**
 * Map a notification row to a D3 DTO.
 */
function toNotificationDto(row: {
  id: string;
  notification_type: string;
  notification_status: string;
  object_type: string | null;
  object_id: string | null;
  title: string;
  body_summary: string | null;
  created_at: Date;
}): NotificationDto {
  return {
    id: row.id,
    notificationType: row.notification_type,
    notificationStatus: row.notification_status as NotificationDto['notificationStatus'],
    objectType: row.object_type,
    objectId: row.object_id,
    title: row.title,
    bodySummary: row.body_summary,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * Get the notification list for the current user.
 */
export async function getNotificationList(
  appUserId: string,
): Promise<NotificationListDto> {
  const [rows, unreadCount] = await Promise.all([
    findNotificationsByUser(appUserId),
    countUnreadNotifications(appUserId),
  ]);

  return {
    notifications: rows.map(toNotificationDto),
    unreadCount,
  };
}

/**
 * Get unread count only (for bell badge).
 */
export async function getUnreadCount(appUserId: string): Promise<number> {
  return countUnreadNotifications(appUserId);
}

/**
 * Mark a single notification as read. Returns true if updated.
 */
export async function markRead(
  notificationId: string,
  appUserId: string,
): Promise<boolean> {
  return markNotificationRead(notificationId, appUserId);
}

/**
 * Mark all notifications as read. Returns count of updated.
 */
export async function markAllRead(appUserId: string): Promise<number> {
  return markAllNotificationsRead(appUserId);
}

/**
 * Get pending legal notices that the user hasn't viewed yet.
 */
export async function getPendingLegalNotices(
  appUserId: string,
): Promise<PendingLegalNoticeDto[]> {
  const pending = await findPendingPolicyNotices(appUserId);

  return pending.map((pnv) => ({
    policyNotice: {
      id: pnv.id,
      noticeType: pnv.notice_type,
      versionLabel: pnv.version_label,
      title: pnv.title,
      summary: pnv.summary,
      documentUrl: pnv.document_url,
      effectiveAt: pnv.effective_at?.toISOString() ?? null,
    },
    requiresAcknowledgement: pnv.requires_acknowledgement,
  }));
}

/**
 * Dismiss a legal notice (mark as viewed, or acknowledged if required).
 */
export async function dismissLegalNotice(
  policyNoticeVersionId: string,
  appUserId: string,
  acknowledge: boolean,
): Promise<void> {
  if (acknowledge) {
    await recordPolicyNoticeAcknowledged(policyNoticeVersionId, appUserId);
  } else {
    await recordPolicyNoticeViewed(policyNoticeVersionId, appUserId);
  }
}
