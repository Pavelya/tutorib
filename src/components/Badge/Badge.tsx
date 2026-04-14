import { type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Badge.module.css';

type BadgeVariant = 'positive' | 'warning' | 'destructive' | 'trust' | 'info';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  variant = 'info',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={clsx(styles.badge, styles[variant], className)} {...props}>
      {children}
    </span>
  );
}
