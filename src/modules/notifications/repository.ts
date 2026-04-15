import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import {
  notifications,
  policyNoticeVersions,
  policyNoticeReceipts,
} from './schema';

export type NotificationRow = typeof notifications.$inferSelect;
export type PolicyNoticeVersionRow = typeof policyNoticeVersions.$inferSelect;
export type PolicyNoticeReceiptRow = typeof policyNoticeReceipts.$inferSelect;

/**
 * Fetch notifications for a user, ordered by most recent first.
 */
export async function findNotificationsByUser(
  appUserId: string,
  limit = 50,
): Promise<NotificationRow[]> {
  const db = getDb();
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.app_user_id, appUserId))
    .orderBy(desc(notifications.created_at))
    .limit(limit);
}

/**
 * Count unread notifications for a user.
 */
export async function countUnreadNotifications(
  appUserId: string,
): Promise<number> {
  const db = getDb();
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.app_user_id, appUserId),
        eq(notifications.notification_status, 'unread'),
      ),
    );
  return result[0]?.count ?? 0;
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(
  notificationId: string,
  appUserId: string,
): Promise<boolean> {
  const db = getDb();
  const result = await db
    .update(notifications)
    .set({
      notification_status: 'read',
      read_at: new Date(),
      updated_at: new Date(),
    })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.app_user_id, appUserId),
      ),
    )
    .returning({ id: notifications.id });
  return result.length > 0;
}

/**
 * Mark all unread notifications as read for a user.
 */
export async function markAllNotificationsRead(
  appUserId: string,
): Promise<number> {
  const db = getDb();
  const result = await db
    .update(notifications)
    .set({
      notification_status: 'read',
      read_at: new Date(),
      updated_at: new Date(),
    })
    .where(
      and(
        eq(notifications.app_user_id, appUserId),
        eq(notifications.notification_status, 'unread'),
      ),
    )
    .returning({ id: notifications.id });
  return result.length;
}

/**
 * Find policy notice versions that the user has NOT yet viewed.
 * Only returns published notices (published_at is not null).
 */
export async function findPendingPolicyNotices(
  appUserId: string,
): Promise<PolicyNoticeVersionRow[]> {
  const db = getDb();

  // Find all published policy notice versions where the user has no receipt
  // with a viewed_at or acknowledged_at timestamp.
  const allPublished = await db
    .select()
    .from(policyNoticeVersions)
    .where(sql`${policyNoticeVersions.published_at} IS NOT NULL`)
    .orderBy(desc(policyNoticeVersions.published_at));

  if (allPublished.length === 0) return [];

  // Get user's receipts
  const receipts = await db
    .select()
    .from(policyNoticeReceipts)
    .where(eq(policyNoticeReceipts.app_user_id, appUserId));

  const viewedVersionIds = new Set(
    receipts
      .filter((r) => r.viewed_at !== null || r.acknowledged_at !== null)
      .map((r) => r.policy_notice_version_id),
  );

  return allPublished.filter((pnv) => !viewedVersionIds.has(pnv.id));
}

/**
 * Record that a user viewed a policy notice (creates receipt if needed).
 */
export async function recordPolicyNoticeViewed(
  policyNoticeVersionId: string,
  appUserId: string,
): Promise<void> {
  const db = getDb();
  const now = new Date();

  // Check for existing receipt
  const existing = await db
    .select()
    .from(policyNoticeReceipts)
    .where(
      and(
        eq(policyNoticeReceipts.policy_notice_version_id, policyNoticeVersionId),
        eq(policyNoticeReceipts.app_user_id, appUserId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing receipt if not already viewed
    if (!existing[0].viewed_at) {
      await db
        .update(policyNoticeReceipts)
        .set({ viewed_at: now, updated_at: now })
        .where(eq(policyNoticeReceipts.id, existing[0].id));
    }
    return;
  }

  // Create new receipt
  await db.insert(policyNoticeReceipts).values({
    policy_notice_version_id: policyNoticeVersionId,
    app_user_id: appUserId,
    first_shown_at: now,
    viewed_at: now,
  });
}

/**
 * Record that a user acknowledged a policy notice that requires acknowledgement.
 */
export async function recordPolicyNoticeAcknowledged(
  policyNoticeVersionId: string,
  appUserId: string,
): Promise<void> {
  const db = getDb();
  const now = new Date();

  const existing = await db
    .select()
    .from(policyNoticeReceipts)
    .where(
      and(
        eq(policyNoticeReceipts.policy_notice_version_id, policyNoticeVersionId),
        eq(policyNoticeReceipts.app_user_id, appUserId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(policyNoticeReceipts)
      .set({
        viewed_at: existing[0].viewed_at ?? now,
        acknowledged_at: now,
        updated_at: now,
      })
      .where(eq(policyNoticeReceipts.id, existing[0].id));
    return;
  }

  await db.insert(policyNoticeReceipts).values({
    policy_notice_version_id: policyNoticeVersionId,
    app_user_id: appUserId,
    first_shown_at: now,
    viewed_at: now,
    acknowledged_at: now,
  });
}
