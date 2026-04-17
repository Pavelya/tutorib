'use client';

import { useActionState, useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { Select } from '@/components/Select/Select';
import { Textarea } from '@/components/Textarea/Textarea';
import { InlineNotice } from '@/components/InlineNotice/InlineNotice';
import {
  createBookingRequestAction,
  type BookingRequestActionResult,
} from '@/modules/lessons/actions';
import { DURATION_MINUTES } from '@/modules/lessons/validation';
import styles from './book.module.css';

interface BookFormClientProps {
  matchCandidateId: string;
  initialTimezone: string;
  minimumNoticeHours: number;
  defaultDurationMinutes?: number;
}

function buildDefaultStart(timezone: string, minimumNoticeHours: number): {
  date: string;
  time: string;
} {
  // Default the picker to the top of the next hour at least `minimumNoticeHours`
  // from now, rounded up so students don't fight the validator.
  const earliest = DateTime.now()
    .setZone(timezone)
    .plus({ hours: minimumNoticeHours + 1 })
    .startOf('hour');

  return {
    date: earliest.toFormat('yyyy-LL-dd'),
    time: earliest.toFormat('HH:mm'),
  };
}

export function BookFormClient({
  matchCandidateId,
  initialTimezone,
  minimumNoticeHours,
  defaultDurationMinutes = 60,
}: BookFormClientProps) {
  const [timezone, setTimezone] = useState(initialTimezone);

  // Prefer the browser's detected timezone if different from the server hint.
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected && detected !== timezone) setTimezone(detected);
    } catch {
      // ignore — keep the server-provided timezone
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaults = buildDefaultStart(timezone, minimumNoticeHours);
  const [date, setDate] = useState(defaults.date);
  const [time, setTime] = useState(defaults.time);
  const [duration, setDuration] = useState(String(defaultDurationMinutes));
  const [note, setNote] = useState('');

  const [state, formAction, isPending] = useActionState<
    BookingRequestActionResult | null,
    FormData
  >(createBookingRequestAction, null);

  const fieldErrors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const formError = state && !state.ok ? state.message : undefined;

  // Build the ISO datetime with timezone offset from the selected date+time.
  const composed = DateTime.fromFormat(`${date} ${time}`, 'yyyy-LL-dd HH:mm', {
    zone: timezone,
  });
  const scheduledStartAt = composed.isValid ? composed.toISO() : '';

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="matchCandidateId" value={matchCandidateId} />
      <input type="hidden" name="scheduledStartAt" value={scheduledStartAt} />
      <input type="hidden" name="timezone" value={timezone} />

      <div className={styles.fieldRow}>
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          error={fieldErrors.scheduledStartAt?.[0]}
        />
        <Input
          label="Start time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          hint={`Times in ${timezone}`}
        />
      </div>

      <Select
        label="Duration"
        name="durationMinutes"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        error={fieldErrors.durationMinutes?.[0]}
      >
        {DURATION_MINUTES.map((m) => (
          <option key={m} value={m}>
            {m} minutes
          </option>
        ))}
      </Select>

      <Textarea
        label="Anything your tutor should know? (optional)"
        name="studentNote"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Share context, goals, or what you want to focus on."
      />

      {formError && <InlineNotice variant="warning">{formError}</InlineNotice>}

      <div className={styles.submitRow}>
        <Button type="submit" disabled={isPending || !scheduledStartAt || undefined}>
          {isPending ? 'Starting checkout…' : 'Request lesson and authorize payment'}
        </Button>
        <p className={styles.disclaimer}>
          You will be redirected to Stripe to authorize a hold. The card is
          captured only when the tutor accepts.
        </p>
      </div>
    </form>
  );
}
