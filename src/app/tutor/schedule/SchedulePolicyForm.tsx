'use client';

import { useActionState } from 'react';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { updateSchedulePolicyAction } from '@/modules/availability/actions';
import type { SchedulePolicyDto } from '@/modules/availability/dto';
import styles from './schedule.module.css';

interface SchedulePolicyFormProps {
  policy: SchedulePolicyDto;
}

export function SchedulePolicyForm({ policy }: SchedulePolicyFormProps) {
  const [state, action, isPending] = useActionState(
    updateSchedulePolicyAction,
    null,
  );

  const fieldErrors = state?.ok === false ? state.fieldErrors : undefined;
  const generalError =
    state?.ok === false && !state.fieldErrors ? state.message : undefined;

  return (
    <form action={action} className={styles.form}>
      <div className={styles.formGrid}>
        <Input
          label="Booking timezone"
          name="timezone"
          defaultValue={policy.timezone}
          required
          maxLength={64}
          hint="IANA timezone (e.g. America/New_York)."
          error={fieldErrors?.timezone?.[0]}
        />
        <Input
          label="Minimum notice (minutes)"
          name="minimumNoticeMinutes"
          type="number"
          min={480}
          max={20160}
          step={15}
          defaultValue={policy.minimum_notice_minutes}
          required
          hint="Floor is 8 hours (480 minutes)."
          error={fieldErrors?.minimumNoticeMinutes?.[0]}
        />
        <Input
          label="Buffer before lessons (minutes)"
          name="bufferBeforeMinutes"
          type="number"
          min={0}
          max={240}
          step={5}
          defaultValue={policy.buffer_before_minutes}
          required
          error={fieldErrors?.bufferBeforeMinutes?.[0]}
        />
        <Input
          label="Buffer after lessons (minutes)"
          name="bufferAfterMinutes"
          type="number"
          min={0}
          max={240}
          step={5}
          defaultValue={policy.buffer_after_minutes}
          required
          error={fieldErrors?.bufferAfterMinutes?.[0]}
        />
        <Input
          label="Daily lesson cap"
          name="dailyCapacity"
          type="number"
          min={1}
          max={50}
          defaultValue={policy.daily_capacity ?? ''}
          hint="Leave blank for no cap."
          error={fieldErrors?.dailyCapacity?.[0]}
        />
        <Input
          label="Weekly lesson cap"
          name="weeklyCapacity"
          type="number"
          min={1}
          max={50}
          defaultValue={policy.weekly_capacity ?? ''}
          hint="Leave blank for no cap."
          error={fieldErrors?.weeklyCapacity?.[0]}
        />
      </div>

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          name="isAcceptingNewStudents"
          defaultChecked={policy.is_accepting_new_students}
        />
        <span>Accepting new students</span>
      </label>

      {generalError && (
        <p className={styles.errorMessage} role="alert">
          {generalError}
        </p>
      )}
      {state?.ok === true && (
        <p className={styles.successMessage}>Booking rules saved.</p>
      )}

      <div className={styles.formActions}>
        <Button
          type="submit"
          variant="primary"
          size="compact"
          disabled={isPending}
        >
          {isPending ? 'Saving…' : 'Save booking rules'}
        </Button>
      </div>
    </form>
  );
}
