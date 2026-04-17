'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/Button/Button';
import { Panel } from '@/components/Panel/Panel';
import { ProgressStrip } from '@/components/ProgressStrip/ProgressStrip';
import { NeedSummaryBar } from '@/components/NeedSummaryBar/NeedSummaryBar';
import { OptionCard } from '@/components/OptionCard/OptionCard';
import { Textarea } from '@/components/Textarea/Textarea';
import { InlineNotice } from '@/components/InlineNotice/InlineNotice';
import {
  needTypeOptions,
  urgencyOptions,
  supportStyleOptions,
} from '@/modules/learning-needs/validation';
import {
  submitLearningNeedAction,
  type SubmitLearningNeedActionResult,
} from '@/modules/learning-needs/actions';
import styles from './match-flow.module.css';

const TOTAL_STEPS = 4;

const STEP_LABELS = [
  'What do you need help with?',
  'How urgent is this?',
  'What kind of support?',
  'Review and find matches',
];

const GUIDANCE = [
  {
    title: 'Why this matters',
    body: 'Not every tutor handles the same IB situation. Telling us the pressure point means better fits from the start.',
    quote: 'The right tutor for an IA draft review may differ from the right tutor for weekly support.',
  },
  {
    title: 'Urgency shapes matching',
    body: 'We use urgency to factor in tutor availability. Urgent needs surface tutors with near-term openings.',
    quote: 'If your deadline is this week, we prioritise tutors who can meet you soon.',
  },
  {
    title: 'Support style helps scheduling',
    body: 'One-off sessions need a tutor with a free slot. Weekly support needs ongoing availability overlap.',
    quote: 'Matching for recurring sessions is different from matching for a single urgent session.',
  },
  {
    title: 'Ready to find your best fits',
    body: 'We will match you with tutors based on what you have told us. You can always come back and change your answers.',
    quote: null,
  },
];

function buildSummaryChips(data: {
  needType: string;
  urgencyLevel: string;
  supportStyle: string;
}) {
  const chips: { label: string; tone?: 'default' | 'muted' | 'warm' }[] = [];

  const needLabel = needTypeOptions.find((o) => o.value === data.needType)?.label;
  if (needLabel) chips.push({ label: needLabel });

  const urgLabel = urgencyOptions.find((o) => o.value === data.urgencyLevel)?.label;
  if (urgLabel) chips.push({ label: urgLabel, tone: data.urgencyLevel === 'urgent' ? 'warm' : 'default' });

  const styleLabel = supportStyleOptions.find((o) => o.value === data.supportStyle)?.label;
  if (styleLabel) chips.push({ label: styleLabel, tone: 'muted' });

  return chips;
}

export function MatchFlowClient() {
  const [step, setStep] = useState(1);
  const [needType, setNeedType] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('');
  const [supportStyle, setSupportStyle] = useState('');
  const [freeTextNote, setFreeTextNote] = useState('');

  const [actionState, formAction, isPending] = useActionState(
    submitLearningNeedAction,
    null,
  );

  const canContinue =
    step === 1 ? needType !== '' :
    step === 2 ? urgencyLevel !== '' :
    step === 3 ? supportStyle !== '' :
    true;

  const handleContinue = () => {
    if (canContinue && step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const summaryChips = buildSummaryChips({ needType, urgencyLevel, supportStyle });
  const needLabel = needTypeOptions.find((o) => o.value === needType)?.label ?? 'Your need';
  const guidance = GUIDANCE[step - 1];

  return (
    <div className={styles.flow}>
      <ProgressStrip
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        stepLabel={STEP_LABELS[step - 1]}
        className={styles.progress}
      />

      {summaryChips.length > 0 && (
        <NeedSummaryBar
          label="Need so far"
          need={needLabel}
          qualifiers={summaryChips.slice(1)}
          variant="compact"
          state="draft"
          className={styles.summary}
        />
      )}

      <div className={styles.grid}>
        <Panel as="section" className={styles.questionPanel}>
          <span className={styles.kicker}>Current question</span>
          <h2 className={styles.questionTitle}>{STEP_LABELS[step - 1]}</h2>

          {step === 1 && (
            <div className={styles.optionList}>
              {needTypeOptions.map((opt) => (
                <OptionCard
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={needType === opt.value}
                  onSelect={setNeedType}
                  name="needType"
                />
              ))}
            </div>
          )}

          {step === 2 && (
            <div className={styles.optionList}>
              {urgencyOptions.map((opt) => (
                <OptionCard
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={urgencyLevel === opt.value}
                  onSelect={setUrgencyLevel}
                  name="urgencyLevel"
                />
              ))}
            </div>
          )}

          {step === 3 && (
            <div className={styles.optionList}>
              {supportStyleOptions.map((opt) => (
                <OptionCard
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={supportStyle === opt.value}
                  onSelect={setSupportStyle}
                  name="supportStyle"
                />
              ))}
            </div>
          )}

          {step === 4 && (
            <div className={styles.reviewStep}>
              <NeedSummaryBar
                need={needLabel}
                qualifiers={summaryChips.slice(1)}
                state="locked"
              />
              <Textarea
                label="Anything else your tutor should know? (optional)"
                name="freeTextNote"
                value={freeTextNote}
                onChange={(e) => setFreeTextNote(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="E.g. my draft is 1200 words and the deadline is next Friday..."
              />
              {actionState && !actionState.ok && actionState.message && (
                <InlineNotice variant="warning">{actionState.message}</InlineNotice>
              )}
              {actionState && !actionState.ok && actionState.fieldErrors && (
                <InlineNotice variant="warning">
                  Please check your selections and try again.
                </InlineNotice>
              )}
            </div>
          )}

          <div className={styles.actionRow}>
            {step > 1 && (
              <Button variant="secondary" type="button" onClick={handleBack}>
                Back
              </Button>
            )}
            {step < TOTAL_STEPS && (
              <Button
                type="button"
                onClick={handleContinue}
                disabled={!canContinue || undefined}
              >
                Continue
              </Button>
            )}
            {step === TOTAL_STEPS && (
              <form action={formAction}>
                <input type="hidden" name="needType" value={needType} />
                <input type="hidden" name="urgencyLevel" value={urgencyLevel} />
                <input type="hidden" name="supportStyle" value={supportStyle} />
                {freeTextNote && (
                  <input type="hidden" name="freeTextNote" value={freeTextNote} />
                )}
                <Button type="submit" disabled={isPending || undefined}>
                  {isPending ? 'Finding matches...' : 'See best fits'}
                </Button>
              </form>
            )}
          </div>
        </Panel>

        <Panel as="aside" variant="warm" className={styles.helperPanel}>
          <span className={styles.kicker}>Guidance</span>
          <h3 className={styles.helperTitle}>{guidance.title}</h3>
          <p className={styles.helperBody}>{guidance.body}</p>
          {guidance.quote && (
            <blockquote className={styles.helperQuote}>{guidance.quote}</blockquote>
          )}
        </Panel>
      </div>
    </div>
  );
}
