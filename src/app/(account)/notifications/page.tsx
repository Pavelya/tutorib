import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveAccountState } from '@/modules/accounts/service';
import { getNotificationList } from '@/modules/notifications/service';
import { Panel } from '@/components/Panel/Panel';
import { Badge } from '@/components/Badge/Badge';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { site } from '@/lib/config/site';
import { NotificationActions } from './NotificationActions';
import styles from './notifications.module.css';

export const metadata: Metadata = {
  title: `Notifications — ${site.name}`,
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  lesson_request_submitted: 'Lesson request',
  lesson_accepted: 'Lesson accepted',
  lesson_declined: 'Lesson declined',
  lesson_expired: 'Lesson expired',
  lesson_cancelled: 'Lesson cancelled',
  lesson_rescheduled: 'Lesson rescheduled',
  lesson_reminder: 'Lesson reminder',
  lesson_issue_acknowledged: 'Issue acknowledged',
  lesson_issue_resolved: 'Issue resolved',
  payout_ready: 'Payout ready',
  payout_hold: 'Payout hold',
  legal_update: 'Policy update',
};

function getTypeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type] ?? type.replace(/_/g, ' ');
}

function getBadgeVariant(type: string): 'positive' | 'warning' | 'destructive' | 'trust' | 'info' {
  if (type.includes('accepted') || type.includes('ready') || type.includes('resolved')) return 'positive';
  if (type.includes('declined') || type.includes('cancelled') || type.includes('expired')) return 'destructive';
  if (type.includes('reminder') || type.includes('hold') || type.includes('issue')) return 'warning';
  if (type.includes('legal')) return 'trust';
  return 'info';
}

export default async function NotificationsPage() {
  const state = await resolveAccountState();

  if (state.status === 'unauthenticated' || !('appUser' in state)) {
    notFound();
  }

  const { notifications, unreadCount } = await getNotificationList(state.appUser.id);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Notifications</h1>
        {unreadCount > 0 && <NotificationActions />}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          heading="No notifications yet"
          description="You'll see lesson updates, policy changes, and other important information here."
        />
      ) : (
        <ul className={styles.list}>
          {notifications.map((n) => (
            <li key={n.id}>
              <Panel
                as="article"
                variant={n.notificationStatus === 'unread' ? 'default' : 'soft'}
                className={styles.item}
              >
                <div className={styles.itemHeader}>
                  <Badge variant={getBadgeVariant(n.notificationType)}>
                    {getTypeLabel(n.notificationType)}
                  </Badge>
                  {n.notificationStatus === 'unread' && (
                    <span className={styles.unreadDot} aria-label="Unread" />
                  )}
                </div>
                <p className={styles.title}>{n.title}</p>
                {n.bodySummary && (
                  <p className={styles.body}>{n.bodySummary}</p>
                )}
                <time className={styles.time} dateTime={n.createdAt}>
                  {new Date(n.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </time>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
