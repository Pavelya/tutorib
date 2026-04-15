/**
 * Notification DTOs — D3 (authenticated self).
 * Shaped for /notifications and bell surface consumption.
 */

export interface NotificationDto {
  id: string;
  notificationType: string;
  notificationStatus: 'unread' | 'read' | 'dismissed';
  objectType: string | null;
  objectId: string | null;
  title: string;
  bodySummary: string | null;
  createdAt: string; // ISO string
}

export interface NotificationListDto {
  notifications: NotificationDto[];
  unreadCount: number;
}

export interface PolicyNoticeVersionDto {
  id: string;
  noticeType: string;
  versionLabel: string;
  title: string;
  summary: string | null;
  documentUrl: string | null;
  effectiveAt: string | null; // ISO string
}

export interface PendingLegalNoticeDto {
  policyNotice: PolicyNoticeVersionDto;
  requiresAcknowledgement: boolean;
}
