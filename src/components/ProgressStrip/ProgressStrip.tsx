import clsx from 'clsx';
import styles from './ProgressStrip.module.css';

interface ProgressStripProps {
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
  className?: string;
}

export function ProgressStrip({
  currentStep,
  totalSteps,
  stepLabel,
  className,
}: ProgressStripProps) {
  const pct = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className={clsx(styles.strip, className)}>
      <div className={styles.meta}>
        <span className={styles.stepCount}>
          Step {currentStep} of {totalSteps}
        </span>
        <span className={styles.stepLabel}>{stepLabel}</span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Step ${currentStep} of ${totalSteps}: ${stepLabel}`}
      >
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
