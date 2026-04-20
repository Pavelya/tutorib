'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';

import clsx from 'clsx';
import { Button } from '@/components/Button/Button';
import { replaceAvailabilityWindowsAction } from '@/modules/availability/actions';
import type { AvailabilityRuleDto } from '@/modules/availability/dto';
import { DAYS_OF_WEEK } from '@/modules/availability/dto';
import styles from './schedule.module.css';

interface AvailabilityGridProps {
  rules: AvailabilityRuleDto[];
}

type HourMatrix = boolean[][];

const HOURS_PER_DAY = 24;
const DAYS = 7;

export function AvailabilityGrid({ rules }: AvailabilityGridProps) {
  const [matrix, setMatrix] = useState<HourMatrix>(() => matrixFromRules(rules));
  const [dirty, setDirty] = useState(false);
  const [rulesSnapshot, setRulesSnapshot] = useState(rules);
  const paintRef = useRef<{ value: boolean } | null>(null);

  // Parent-prop sync pattern: when the server re-renders with fresh rules
  // (after a save), reset the local grid without running an effect.
  if (rules !== rulesSnapshot) {
    setRulesSnapshot(rules);
    setMatrix(matrixFromRules(rules));
    setDirty(false);
  }

  const [state, action, isPending] = useActionState(
    replaceAvailabilityWindowsAction,
    null,
  );

  const endPaint = () => {
    paintRef.current = null;
  };
  useEffect(() => {
    window.addEventListener('mouseup', endPaint);
    window.addEventListener('mouseleave', endPaint);
    return () => {
      window.removeEventListener('mouseup', endPaint);
      window.removeEventListener('mouseleave', endPaint);
    };
  }, []);

  const setCell = (day: number, hour: number, value: boolean) => {
    setMatrix((prev) => {
      if (prev[day][hour] === value) return prev;
      const next = prev.map((row) => row.slice());
      next[day][hour] = value;
      return next;
    });
    setDirty(true);
  };

  const handleMouseDown = (day: number, hour: number) => {
    const nextValue = !matrix[day][hour];
    paintRef.current = { value: nextValue };
    setCell(day, hour, nextValue);
  };

  const handleMouseEnter = (day: number, hour: number) => {
    if (!paintRef.current) return;
    setCell(day, hour, paintRef.current.value);
  };

  const handleClearAll = () => {
    setMatrix(emptyMatrix());
    setDirty(true);
  };

  const handleReset = () => {
    setMatrix(matrixFromRules(rules));
    setDirty(false);
  };

  const windowsJson = useMemo(() => JSON.stringify(windowsFromMatrix(matrix)), [
    matrix,
  ]);
  const windowCount = useMemo(() => windowsFromMatrix(matrix).length, [matrix]);

  const generalError =
    state?.ok === false && !state.fieldErrors ? state.message : undefined;
  const fieldError =
    state?.ok === false && state.fieldErrors?.windows?.[0];

  return (
    <form action={action} className={styles.gridForm}>
      <input type="hidden" name="windows" value={windowsJson} />

      <div
        className={styles.gridWrap}
        role="group"
        aria-label="Weekly availability"
      >
        <div className={styles.gridScroll}>
          <div
            className={styles.grid}
            style={{
              gridTemplateColumns: `auto repeat(${HOURS_PER_DAY}, minmax(18px, 1fr))`,
            }}
          >
            <div className={styles.gridCorner} aria-hidden="true" />
            {Array.from({ length: HOURS_PER_DAY }, (_, h) => (
              <div key={`h-${h}`} className={styles.gridHourHeader}>
                {h % 3 === 0 ? formatHourLabel(h) : ''}
              </div>
            ))}
            {DAYS_OF_WEEK.map((day) => (
              <DayRow
                key={day.value}
                dayValue={day.value}
                dayLabel={day.short}
                hours={matrix[day.value]}
                onMouseDown={handleMouseDown}
                onMouseEnter={handleMouseEnter}
              />
            ))}
          </div>
        </div>
        <p className={styles.gridLegend}>
          Click or drag across cells to mark the hours you&rsquo;re available.
          Times are in your local timezone.
        </p>
      </div>

      <div className={styles.gridActions}>
        <span className={styles.gridSummary}>
          {countActive(matrix)} hours · {windowCount} window
          {windowCount === 1 ? '' : 's'}
        </span>
        <div className={styles.gridActionButtons}>
          <Button
            type="button"
            variant="ghost"
            size="compact"
            onClick={handleClearAll}
            disabled={isPending || countActive(matrix) === 0}
          >
            Clear all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="compact"
            onClick={handleReset}
            disabled={isPending || !dirty}
          >
            Reset
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="compact"
            disabled={isPending || !dirty}
          >
            {isPending ? 'Saving…' : 'Save availability'}
          </Button>
        </div>
      </div>

      {generalError && (
        <p className={styles.errorMessage} role="alert">
          {generalError}
        </p>
      )}
      {fieldError && (
        <p className={styles.errorMessage} role="alert">
          {fieldError}
        </p>
      )}
      {state?.ok === true && !dirty && (
        <p className={styles.successMessage}>Availability saved.</p>
      )}
    </form>
  );
}

interface DayRowProps {
  dayValue: number;
  dayLabel: string;
  hours: boolean[];
  onMouseDown: (day: number, hour: number) => void;
  onMouseEnter: (day: number, hour: number) => void;
}

function DayRow({
  dayValue,
  dayLabel,
  hours,
  onMouseDown,
  onMouseEnter,
}: DayRowProps) {
  return (
    <>
      <div className={styles.gridDayLabel}>{dayLabel}</div>
      {hours.map((active, hour) => (
        <button
          key={`${dayValue}-${hour}`}
          type="button"
          className={clsx(styles.gridCell, active && styles.gridCellActive)}
          onMouseDown={(e) => {
            e.preventDefault();
            onMouseDown(dayValue, hour);
          }}
          onMouseEnter={() => onMouseEnter(dayValue, hour)}
          aria-label={`${dayLabel} ${formatHourLabel(hour)}`}
          aria-pressed={active}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Matrix helpers
// ---------------------------------------------------------------------------

function emptyMatrix(): HourMatrix {
  return Array.from({ length: DAYS }, () =>
    Array.from({ length: HOURS_PER_DAY }, () => false),
  );
}

function matrixFromRules(rules: AvailabilityRuleDto[]): HourMatrix {
  const matrix = emptyMatrix();
  for (const rule of rules) {
    if (rule.visibility_status !== 'active') continue;
    const start = parseHour(rule.start_local_time, 'floor');
    const end = parseHour(rule.end_local_time, 'ceil');
    for (let h = start; h < end && h < HOURS_PER_DAY; h++) {
      if (rule.day_of_week >= 0 && rule.day_of_week < DAYS) {
        matrix[rule.day_of_week][h] = true;
      }
    }
  }
  return matrix;
}

function parseHour(time: string, mode: 'floor' | 'ceil'): number {
  // Input shape is `HH:MM` (pre-trimmed). 24:00 is valid for end-of-day.
  const [hh, mm] = time.split(':');
  const hour = Number(hh);
  const minute = Number(mm);
  if (!Number.isFinite(hour)) return 0;
  if (mode === 'floor' || !Number.isFinite(minute) || minute === 0) {
    return Math.max(0, Math.min(24, hour));
  }
  return Math.max(0, Math.min(24, hour + 1));
}

interface HourWindow {
  dayOfWeek: number;
  startHour: number;
  endHour: number;
}

function windowsFromMatrix(matrix: HourMatrix): HourWindow[] {
  const windows: HourWindow[] = [];
  for (let day = 0; day < DAYS; day++) {
    let start: number | null = null;
    for (let hour = 0; hour < HOURS_PER_DAY; hour++) {
      const active = matrix[day][hour];
      if (active && start === null) {
        start = hour;
      } else if (!active && start !== null) {
        windows.push({ dayOfWeek: day, startHour: start, endHour: hour });
        start = null;
      }
    }
    if (start !== null) {
      windows.push({ dayOfWeek: day, startHour: start, endHour: HOURS_PER_DAY });
    }
  }
  return windows;
}

function countActive(matrix: HourMatrix): number {
  let total = 0;
  for (const row of matrix) for (const v of row) if (v) total++;
  return total;
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12a';
  if (hour === 12) return '12p';
  if (hour < 12) return `${hour}a`;
  return `${hour - 12}p`;
}
