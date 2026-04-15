import { type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './ErrorState.module.css';

interface ErrorStateProps {
  heading?: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  heading = 'Something went wrong',
  message,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div className={clsx(styles.root, className)} role="alert">
      <p className={styles.heading}>{heading}</p>
      <p className={styles.message}>{message}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
