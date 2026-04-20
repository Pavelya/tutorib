'use client';

import { useActionState } from 'react';
import { Button } from '@/components/Button/Button';
import { InlineNotice } from '@/components/InlineNotice/InlineNotice';
import {
  acceptLessonAction,
  declineLessonAction,
  type TutorLessonActionResult,
} from '@/modules/lessons/actions';
import styles from './lesson-detail.module.css';

interface TutorRequestActionsProps {
  lessonId: string;
  priceLine: string | null;
}

export function TutorRequestActions({
  lessonId,
  priceLine,
}: TutorRequestActionsProps) {
  const [acceptState, acceptFormAction, acceptPending] = useActionState<
    TutorLessonActionResult | null,
    FormData
  >(acceptLessonAction, null);
  const [declineState, declineFormAction, declinePending] = useActionState<
    TutorLessonActionResult | null,
    FormData
  >(declineLessonAction, null);

  if (acceptState?.ok) {
    return (
      <InlineNotice variant="success">
        <strong>Request accepted</strong>
        <p>
          The student is notified and the payment authorization has been captured.
        </p>
      </InlineNotice>
    );
  }

  if (declineState?.ok) {
    return (
      <InlineNotice variant="success">
        <strong>Request declined</strong>
        <p>
          The student is notified and the payment authorization has been released.
        </p>
      </InlineNotice>
    );
  }

  const pending = acceptPending || declinePending;
  const errorState =
    (acceptState && !acceptState.ok ? acceptState : null) ??
    (declineState && !declineState.ok ? declineState : null);

  return (
    <div className={styles.actionGroup}>
      <p className={styles.policyLine}>
        Accepting captures the held authorization
        {priceLine ? ` (${priceLine})` : ''} and confirms the lesson with the
        student. Declining releases the authorization without a charge.
      </p>
      {errorState && (
        <InlineNotice variant="warning">{errorState.message}</InlineNotice>
      )}
      <div className={styles.actionRow}>
        <form action={acceptFormAction}>
          <input type="hidden" name="lessonId" value={lessonId} />
          <Button type="submit" variant="primary" disabled={pending}>
            {acceptPending ? 'Accepting…' : 'Accept request'}
          </Button>
        </form>
        <form action={declineFormAction}>
          <input type="hidden" name="lessonId" value={lessonId} />
          <Button type="submit" variant="secondary" disabled={pending}>
            {declinePending ? 'Declining…' : 'Decline request'}
          </Button>
        </form>
      </div>
    </div>
  );
}
