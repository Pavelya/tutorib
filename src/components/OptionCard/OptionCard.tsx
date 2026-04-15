'use client';

import clsx from 'clsx';
import styles from './OptionCard.module.css';

interface OptionCardProps {
  value: string;
  label: string;
  description?: string;
  selected: boolean;
  onSelect: (value: string) => void;
  name: string;
}

export function OptionCard({
  value,
  label,
  description,
  selected,
  onSelect,
  name,
}: OptionCardProps) {
  return (
    <label
      className={clsx(styles.card, selected && styles.active)}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className={styles.input}
      />
      <div className={styles.content}>
        <strong className={styles.label}>{label}</strong>
        {description && <span className={styles.description}>{description}</span>}
      </div>
      <div className={styles.radio} aria-hidden="true" />
    </label>
  );
}
