import clsx from 'clsx';
import styles from './ContextChipRow.module.css';

type ChipTone = 'default' | 'muted' | 'warm';

interface Chip {
  label: string;
  tone?: ChipTone;
}

interface ContextChipRowProps {
  chips: Chip[];
  max?: number;
  className?: string;
}

export function ContextChipRow({ chips, max, className }: ContextChipRowProps) {
  const visible = max && max < chips.length ? chips.slice(0, max) : chips;
  const overflowCount = max && max < chips.length ? chips.length - max : 0;

  return (
    <div className={clsx(styles.row, className)}>
      {visible.map((chip) => (
        <span
          key={chip.label}
          className={clsx(
            styles.chip,
            chip.tone === 'muted' && styles.muted,
            chip.tone === 'warm' && styles.warm,
          )}
        >
          {chip.label}
        </span>
      ))}
      {overflowCount > 0 && (
        <span className={clsx(styles.chip, styles.overflow)}>
          +{overflowCount} more
        </span>
      )}
    </div>
  );
}
