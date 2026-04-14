import { type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './InlineNotice.module.css';

type InlineNoticeVariant = 'info' | 'warning' | 'success' | 'action-needed';

interface InlineNoticeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: InlineNoticeVariant;
}

const variantRoleMap: Record<InlineNoticeVariant, string | undefined> = {
  info: 'note',
  warning: 'alert',
  success: 'status',
  'action-needed': 'alert',
};

export function InlineNotice({
  variant = 'info',
  className,
  children,
  ...props
}: InlineNoticeProps) {
  return (
    <div
      role={variantRoleMap[variant]}
      className={clsx(styles.notice, styles[variantClass(variant)], className)}
      {...props}
    >
      {children}
    </div>
  );
}

function variantClass(variant: InlineNoticeVariant): string {
  if (variant === 'action-needed') return 'actionNeeded';
  return variant;
}
