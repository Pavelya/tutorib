'use client';

import { useActionState, useRef, useState } from 'react';
import { Button } from '@/components/Button/Button';
import { InlineNotice } from '@/components/InlineNotice/InlineNotice';
import { updateSchedulePolicyAction } from '@/modules/availability/actions';
import type { SchedulePolicyDto } from '@/modules/availability/dto';
import styles from './schedule.module.css';

interface SchedulePolicyFormProps {
  policy: SchedulePolicyDto;
  timezoneLabel: string;
}

export function SchedulePolicyForm({
  policy,
  timezoneLabel,
}: SchedulePolicyFormProps) {
  const [state, action, isPending] = useActionState(
    updateSchedulePolicyAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  const generalError = state?.ok === false ? state.message : undefined;

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.checked) {
      // Don't submit yet — keep the box checked until the tutor confirms.
      e.target.checked = true;
      setPendingConfirm(true);
      return;
    }
    formRef.current?.requestSubmit();
  };

  const handleConfirmPause = () => {
    if (checkboxRef.current) checkboxRef.current.checked = false;
    setPendingConfirm(false);
    formRef.current?.requestSubmit();
  };

  const handleCancelPause = () => {
    setPendingConfirm(false);
  };

  return (
    <form ref={formRef} action={action} className={styles.form}>
      <div className={styles.policyRow}>
        <label className={styles.toggleRow}>
          <input
            ref={checkboxRef}
            type="checkbox"
            name="isAcceptingNewStudents"
            defaultChecked={policy.is_accepting_new_students}
            onChange={handleToggleChange}
            disabled={isPending}
          />
          <span className={styles.toggleLabel}>
            <span className={styles.toggleTitle}>Accepting new students</span>
            <span className={styles.toggleHint}>
              When off, your profile stays listed but students can&rsquo;t
              request new lessons.
            </span>
          </span>
        </label>
        <div className={styles.policyMeta}>
          <span className={styles.policyMetaLabel}>Your timezone</span>
          <span className={styles.policyMetaValue}>{timezoneLabel}</span>
          <span className={styles.policyMetaHint}>
            Students always see times in their own timezone.
          </span>
        </div>
      </div>

      {pendingConfirm && (
        <InlineNotice variant="action-needed" className={styles.confirmNotice}>
          <div className={styles.confirmBody}>
            <div className={styles.confirmCopy}>
              <strong>Pause new student requests?</strong>
              <span>
                Your profile will stay visible but the request button will be
                hidden until you turn this back on.
              </span>
            </div>
            <div className={styles.confirmActions}>
              <Button
                type="button"
                variant="ghost"
                size="compact"
                onClick={handleCancelPause}
                disabled={isPending}
              >
                Keep accepting
              </Button>
              <Button
                type="button"
                variant="primary"
                size="compact"
                onClick={handleConfirmPause}
                disabled={isPending}
              >
                Pause requests
              </Button>
            </div>
          </div>
        </InlineNotice>
      )}

      {generalError && (
        <p className={styles.errorMessage} role="alert">
          {generalError}
        </p>
      )}
      {state?.ok === true && !pendingConfirm && (
        <p className={styles.successMessage}>Booking status saved.</p>
      )}

      <noscript>
        <div className={styles.formActions}>
          <Button type="submit" variant="primary" size="compact">
            Save
          </Button>
        </div>
      </noscript>
    </form>
  );
}
