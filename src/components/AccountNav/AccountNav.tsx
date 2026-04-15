'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import styles from './AccountNav.module.css';

const ACCOUNT_LINKS = [
  { href: '/settings', label: 'Settings' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/billing', label: 'Billing' },
] as const;

interface AccountNavProps {
  unreadCount?: number;
}

export function AccountNav({ unreadCount = 0 }: AccountNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className={styles.nav}>
      <ul className={styles.list}>
        {ACCOUNT_LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={clsx(styles.link, isActive && styles.active)}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
                {link.href === '/notifications' && unreadCount > 0 && (
                  <span className={styles.badge} aria-label={`${unreadCount} unread`}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
