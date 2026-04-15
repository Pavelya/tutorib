import clsx from 'clsx';
import styles from './LoadingState.module.css';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({
  label = 'Loading\u2026',
  className,
}: LoadingStateProps) {
  return (
    <div
      className={clsx(styles.root, className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.label}>{label}</p>
    </div>
  );
}
