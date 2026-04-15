import { type ReactNode } from 'react';
import clsx from 'clsx';
import { ContextChipRow } from '@/components/ContextChipRow/ContextChipRow';
import styles from './NeedSummaryBar.module.css';

type NeedSummaryVariant = 'standard' | 'compact' | 'stacked';
type NeedSummaryState = 'active' | 'draft' | 'locked';

interface Qualifier {
  label: string;
  tone?: 'default' | 'muted' | 'warm';
}

interface NeedSummaryBarProps {
  variant?: NeedSummaryVariant;
  state?: NeedSummaryState;
  label?: string;
  need: string;
  qualifiers?: Qualifier[];
  maxQualifiers?: number;
  action?: ReactNode;
  className?: string;
}

export function NeedSummaryBar({
  variant = 'standard',
  state = 'active',
  label,
  need,
  qualifiers,
  maxQualifiers,
  action,
  className,
}: NeedSummaryBarProps) {
  return (
    <div
      className={clsx(
        styles.bar,
        variant !== 'standard' && styles[variant],
        state !== 'active' && styles[state],
        className,
      )}
      role="region"
      aria-label={label ?? 'Current need'}
    >
      <div className={styles.content}>
        {label && <span className={styles.label}>{label}</span>}
        <span className={styles.need}>{need}</span>
        {qualifiers && qualifiers.length > 0 && (
          <div className={styles.chips}>
            <ContextChipRow chips={qualifiers} max={maxQualifiers} />
          </div>
        )}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
