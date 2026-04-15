import { type ReactNode } from 'react';
import clsx from 'clsx';
import { Avatar } from '@/components/Avatar/Avatar';
import styles from './PersonSummary.module.css';

type PersonSummaryVariant = 'standard' | 'compact' | 'header' | 'operational';
type PersonSummaryState = 'default' | 'verified' | 'new' | 'attention';

interface PersonSummaryProps {
  variant?: PersonSummaryVariant;
  state?: PersonSummaryState;
  name: string;
  avatarSrc?: string;
  descriptor?: string;
  meta?: string[];
  action?: ReactNode;
  className?: string;
}

export function PersonSummary({
  variant = 'standard',
  state = 'default',
  name,
  avatarSrc,
  descriptor,
  meta,
  action,
  className,
}: PersonSummaryProps) {
  const avatarSize =
    variant === 'header' ? 'lg' : variant === 'compact' || variant === 'operational' ? 'sm' : 'md';

  return (
    <div
      className={clsx(
        styles.root,
        variant !== 'standard' && styles[variant],
        state !== 'default' && styles[state],
        className,
      )}
    >
      <Avatar size={avatarSize} name={name} src={avatarSrc} />
      <div className={styles.identity}>
        <span className={styles.name}>
          {name}
          {state === 'verified' && (
            <span className="sr-only"> (verified)</span>
          )}
        </span>
        {descriptor && <p className={styles.descriptor}>{descriptor}</p>}
        {meta && meta.length > 0 && (
          <div className={styles.meta}>
            {meta.map((item) => (
              <span key={item} className={styles.metaItem}>
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
      {action && <div className={styles.actionSlot}>{action}</div>}
    </div>
  );
}
