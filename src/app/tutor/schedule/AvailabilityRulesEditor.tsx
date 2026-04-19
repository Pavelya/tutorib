'use client';

import { useActionState } from 'react';
import { Input } from '@/components/Input/Input';
import { Select } from '@/components/Select/Select';
import { Button } from '@/components/Button/Button';
import {
  createAvailabilityRuleAction,
  deleteAvailabilityRuleAction,
} from '@/modules/availability/actions';
import type { AvailabilityRuleDto } from '@/modules/availability/dto';
import styles from './schedule.module.css';

interface DayOption {
  value: number;
  long: string;
}

interface AvailabilityRulesEditorProps {
  rules: AvailabilityRuleDto[];
  days: DayOption[];
}

export function AvailabilityRulesEditor({
  rules,
  days,
}: AvailabilityRulesEditorProps) {
  const dayLabel = (value: number): string =>
    days.find((d) => d.value === value)?.long ?? `Day ${value}`;

  return (
    <div className={styles.rulesBlock}>
      {rules.length > 0 && (
        <ul className={styles.rulesList}>
          {rules.map((rule) => (
            <li key={rule.id} className={styles.ruleRow}>
              <div className={styles.ruleSummary}>
                <span className={styles.ruleDay}>{dayLabel(rule.day_of_week)}</span>
                <span className={styles.ruleTime}>
                  {rule.start_local_time}–{rule.end_local_time}
                </span>
              </div>
              <DeleteRuleForm ruleId={rule.id} />
            </li>
          ))}
        </ul>
      )}
      <CreateRuleForm days={days} />
    </div>
  );
}

function CreateRuleForm({ days }: { days: DayOption[] }) {
  const [state, action, isPending] = useActionState(
    createAvailabilityRuleAction,
    null,
  );
  const fieldErrors = state?.ok === false ? state.fieldErrors : undefined;
  const generalError =
    state?.ok === false && !state.fieldErrors ? state.message : undefined;

  return (
    <form action={action} className={styles.addRuleForm}>
      <Select
        label="Day"
        name="dayOfWeek"
        defaultValue="1"
        selectSize="compact"
        error={fieldErrors?.dayOfWeek?.[0]}
      >
        {days.map((d) => (
          <option key={d.value} value={d.value}>
            {d.long}
          </option>
        ))}
      </Select>
      <Input
        label="Start (HH:MM)"
        name="startLocalTime"
        type="time"
        defaultValue="09:00"
        required
        inputSize="compact"
        error={fieldErrors?.startLocalTime?.[0]}
      />
      <Input
        label="End (HH:MM)"
        name="endLocalTime"
        type="time"
        defaultValue="17:00"
        required
        inputSize="compact"
        error={fieldErrors?.endLocalTime?.[0]}
      />
      <div className={styles.addRuleActions}>
        <Button
          type="submit"
          variant="secondary"
          size="compact"
          disabled={isPending}
        >
          {isPending ? 'Adding…' : 'Add window'}
        </Button>
      </div>
      {generalError && (
        <p className={styles.errorMessage} role="alert">
          {generalError}
        </p>
      )}
    </form>
  );
}

function DeleteRuleForm({ ruleId }: { ruleId: string }) {
  const [, action, isPending] = useActionState(
    deleteAvailabilityRuleAction,
    null,
  );

  return (
    <form action={action} className={styles.deleteRuleForm}>
      <input type="hidden" name="ruleId" value={ruleId} />
      <Button
        type="submit"
        variant="ghost"
        size="compact"
        disabled={isPending}
      >
        {isPending ? 'Removing…' : 'Remove'}
      </Button>
    </form>
  );
}
