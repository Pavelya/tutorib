import { type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  heading: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  heading,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={clsx(styles.root, className)} role="status">
      <p className={styles.heading}>{heading}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
