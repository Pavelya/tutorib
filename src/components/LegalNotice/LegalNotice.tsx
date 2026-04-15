'use client';

import { useTransition } from 'react';
import { Button } from '@/components/Button/Button';
import { dismissLegalNoticeAction } from '@/modules/notifications/actions';
import type { PendingLegalNoticeDto } from '@/modules/notifications/dto';
import styles from './LegalNotice.module.css';

interface LegalNoticeProps {
  notices: PendingLegalNoticeDto[];
}

export function LegalNotice({ notices }: LegalNoticeProps) {
  const [isPending, startTransition] = useTransition();

  if (notices.length === 0) return null;

  // Show the most recent pending notice
  const notice = notices[0];
  const { policyNotice, requiresAcknowledgement } = notice;

  function handleDismiss() {
    startTransition(async () => {
      await dismissLegalNoticeAction(policyNotice.id, requiresAcknowledgement);
    });
  }

  return (
    <div className={styles.banner} role="alert">
      <div className={styles.content}>
        <p className={styles.title}>{policyNotice.title}</p>
        {policyNotice.summary && (
          <p className={styles.summary}>{policyNotice.summary}</p>
        )}
        <div className={styles.actions}>
          {policyNotice.documentUrl && (
            <a
              href={policyNotice.documentUrl}
              className={styles.viewLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              View full document
            </a>
          )}
          <Button
            variant="primary"
            size="compact"
            onClick={handleDismiss}
            disabled={isPending}
          >
            {requiresAcknowledgement ? 'I understand' : 'Dismiss'}
          </Button>
        </div>
      </div>
    </div>
  );
}
