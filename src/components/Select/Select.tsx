import { type SelectHTMLAttributes, useId } from 'react';
import clsx from 'clsx';
import styles from './Select.module.css';

type SelectSize = 'default' | 'compact';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  selectSize?: SelectSize;
  children: React.ReactNode;
}

export function Select({
  label,
  hint,
  error,
  selectSize = 'default',
  className,
  id: externalId,
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={clsx(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      <div className={styles.wrapper}>
        <select
          id={id}
          className={clsx(
            styles.select,
            selectSize === 'compact' && styles.compact,
            error && styles.hasError,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        >
          {children}
        </select>
        <svg
          className={styles.chevron}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
