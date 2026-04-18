'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/Button/Button';
import { InlineNotice } from '@/components/InlineNotice/InlineNotice';
import { Select } from '@/components/Select/Select';
import {
  cancelLessonAction,
  reportLessonIssueAction,
  type CancelLessonActionResult,
  type ReportLessonIssueActionResult,
} from '@/modules/lessons/actions';
import type {
  LessonCancellationPolicyDto,
  StudentLessonState,
} from '@/modules/lessons/dto';
import styles from './lesson-detail.module.css';

// ---------------------------------------------------------------------------
// Cancel lesson form
// ---------------------------------------------------------------------------

interface CancelLessonFormProps {
  lessonId: string;
  policy: LessonCancellationPolicyDto;
  lessonState: StudentLessonState;
}

export function CancelLessonForm({
  lessonId,
  policy,
  lessonState,
}: CancelLessonFormProps) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<
    CancelLessonActionResult | null,
    FormData
  >(cancelLessonAction, null);

  if (state?.ok) {
    return (
      <InlineNotice variant="success">
        <strong>Lesson cancelled.</strong>
        <p>{refundPostureMessage(state.refundPosture)}</p>
      </InlineNotice>
    );
  }

  if (!policy.can_cancel) {
    return null;
  }

  const policySummary = cancellationPolicySummary(policy, lessonState);

  if (!confirming) {
    return (
      <div className={styles.actionGroup}>
        <p className={styles.policyLine}>{policySummary}</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setConfirming(true)}
        >
          Cancel this lesson
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.cancelConfirm}>
      <input type="hidden" name="lessonId" value={lessonId} />
      <InlineNotice variant="warning">
        <strong>Confirm cancellation</strong>
        <p>{policySummary}</p>
      </InlineNotice>
      {state && !state.ok && (
        <InlineNotice variant="warning">{state.message}</InlineNotice>
      )}
      <div className={styles.actionRow}>
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? 'Cancelling…' : 'Yes, cancel lesson'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          Keep lesson
        </Button>
      </div>
    </form>
  );
}

function cancellationPolicySummary(
  policy: LessonCancellationPolicyDto,
  state: StudentLessonState,
): string {
  if (state === 'requested') {
    return 'Cancelling a requested lesson releases the payment authorization. No charge will be made.';
  }
  if (policy.refund_posture === 'full_refund') {
    return `You are more than ${policy.policy_notice_hours} hours from the start time, so you will receive a full refund.`;
  }
  if (policy.refund_posture === 'no_refund') {
    return `Cancellations within ${policy.policy_notice_hours} hours of the start time are non-refundable. The tutor will receive full payment.`;
  }
  return 'Cancelling this lesson.';
}

type RefundPosture = 'full_refund' | 'no_refund' | 'authorization_released';

function refundPostureMessage(posture: RefundPosture): string {
  switch (posture) {
    case 'full_refund':
      return 'A full refund has been requested. It may take a few business days to appear on your statement.';
    case 'authorization_released':
      return 'The payment authorization has been released. No charge was made.';
    case 'no_refund':
      return 'This cancellation is non-refundable per the platform policy.';
  }
}

// ---------------------------------------------------------------------------
// Report lesson issue form
// ---------------------------------------------------------------------------

interface ReportIssueFormProps {
  lessonId: string;
}

const ISSUE_REASON_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'tutor_absent', label: 'Tutor did not join the lesson' },
  { value: 'wrong_meeting_link', label: 'The meeting link was wrong or missing' },
  { value: 'technical_failure', label: 'A major technical problem occurred' },
  { value: 'partial_delivery', label: 'The lesson was only partially delivered' },
];

export function ReportIssueForm({ lessonId }: ReportIssueFormProps) {
  const [state, formAction, pending] = useActionState<
    ReportLessonIssueActionResult | null,
    FormData
  >(reportLessonIssueAction, null);

  if (state?.ok) {
    return (
      <InlineNotice variant="success">
        <strong>Issue reported</strong>
        <p>
          Thanks — our team will review the lesson issue and follow up with an
          outcome.
        </p>
      </InlineNotice>
    );
  }

  return (
    <form action={formAction} className={styles.issueForm}>
      <input type="hidden" name="lessonId" value={lessonId} />
      <p className={styles.issueIntro}>
        Select the reason that best describes what went wrong. Use structured
        reasons rather than chat so our trust &amp; safety team can respond.
      </p>
      <Select
        name="reason"
        label="Reason"
        required
        defaultValue=""
        error={state && !state.ok ? state.fieldErrors?.reason?.[0] : undefined}
      >
        <option value="" disabled>
          Choose a reason
        </option>
        {ISSUE_REASON_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
      {state && !state.ok && !state.fieldErrors?.reason && (
        <InlineNotice variant="warning">{state.message}</InlineNotice>
      )}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Submitting…' : 'Report issue'}
      </Button>
    </form>
  );
}
