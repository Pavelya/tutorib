import { type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Panel.module.css';

type PanelVariant = 'default' | 'soft' | 'mist' | 'warm' | 'raised';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: PanelVariant;
  as?: 'div' | 'section' | 'article' | 'aside';
}

export function Panel({
  variant = 'default',
  as: Tag = 'div',
  className,
  children,
  ...props
}: PanelProps) {
  return (
    <Tag
      className={clsx(styles.panel, styles[variant], className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
