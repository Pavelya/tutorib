import { type ReactNode } from 'react';
import clsx from 'clsx';
import { Badge } from '@/components/Badge/Badge';
import { PersonSummary } from '@/components/PersonSummary/PersonSummary';
import styles from './LessonSummary.module.css';

type LessonStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'upcoming'
  | 'completed'
  | 'reviewed';

type BadgeVariant = 'positive' | 'warning' | 'destructive' | 'trust' | 'info';

const statusBadgeMap: Record<LessonStatus, { variant: BadgeVariant; label: string }> = {
  pending: { variant: 'warning', label: 'Pending' },
  accepted: { variant: 'positive', label: 'Accepted' },
  declined: { variant: 'destructive', label: 'Declined' },
  cancelled: { variant: 'destructive', label: 'Cancelled' },
  upcoming: { variant: 'positive', label: 'Upcoming' },
  completed: { variant: 'info', label: 'Completed' },
  reviewed: { variant: 'trust', label: 'Reviewed' },
};

interface LessonSummaryProps {
  compact?: boolean;
  status: LessonStatus;
  urgency?: string;
  personName: string;
  personAvatarSrc?: string;
  personDescriptor?: string;
  subject: string;
  dateTime: string;
  price?: string;
  note?: string;
  actions?: ReactNode;
  className?: string;
}

export function LessonSummary({
  compact = false,
  status,
  urgency,
  personName,
  personAvatarSrc,
  personDescriptor,
  subject,
  dateTime,
  price,
  note,
  actions,
  className,
}: LessonSummaryProps) {
  const badge = statusBadgeMap[status];

  return (
    <div
      className={clsx(styles.root, compact && styles.compact, className)}
      role="article"
      aria-label={`${subject} lesson — ${badge.label}`}
    >
      <div className={styles.statusRow}>
        <Badge variant={badge.variant}>{badge.label}</Badge>
        {urgency && <span className={styles.urgency}>{urgency}</span>}
      </div>

      <div className={styles.person}>
        <PersonSummary
          variant={compact ? 'compact' : 'standard'}
          name={personName}
          avatarSrc={personAvatarSrc}
          descriptor={personDescriptor}
        />
      </div>

      <div className={styles.context}>
        <span className={styles.subject}>{subject}</span>
        <span className={styles.datetime}>{dateTime}</span>
        {price && <span className={styles.price}>{price}</span>}
      </div>

      {note && <p className={styles.note}>{note}</p>}

      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
