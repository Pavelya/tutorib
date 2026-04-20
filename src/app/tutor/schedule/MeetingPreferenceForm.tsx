'use client';

import { useActionState, useState } from 'react';
import clsx from 'clsx';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { updateMeetingPreferenceAction } from '@/modules/availability/actions';
import type {
  MeetingPreferenceDto,
  MeetingProviderOptionDto,
} from '@/modules/availability/dto';
import styles from './schedule.module.css';

interface MeetingPreferenceFormProps {
  preference: MeetingPreferenceDto;
  providerOptions: MeetingProviderOptionDto[];
}

// Brand-colored initial chips. Neutral "Other" fallback for unrecognized keys.
const PROVIDER_VISUAL: Record<string, { initial: string; color: string }> = {
  google_meet: { initial: 'M', color: '#00897B' },
  zoom: { initial: 'Z', color: '#2D8CFF' },
  microsoft_teams: { initial: 'T', color: '#5B5FC7' },
  whereby: { initial: 'W', color: '#F15A29' },
  generic_external: { initial: '↗', color: '#6B7280' },
};

export function MeetingPreferenceForm({
  preference,
  providerOptions,
}: MeetingPreferenceFormProps) {
  const [state, action, isPending] = useActionState(
    updateMeetingPreferenceAction,
    null,
  );

  const fieldErrors = state?.ok === false ? state.fieldErrors : undefined;
  const generalError =
    state?.ok === false && !state.fieldErrors ? state.message : undefined;

  const initialProvider =
    preference.provider_key ?? providerOptions[0]?.key ?? '';
  const [selectedProvider, setSelectedProvider] = useState(initialProvider);

  if (providerOptions.length === 0) {
    return (
      <p className={styles.errorMessage} role="alert">
        No meeting providers are available. Contact support.
      </p>
    );
  }

  return (
    <form action={action} className={styles.form}>
      <fieldset className={styles.providerFieldset}>
        <legend className={styles.providerLegend}>Provider</legend>
        <div
          className={styles.providerList}
          role="radiogroup"
          aria-label="Meeting provider"
        >
          {providerOptions.map((option) => {
            const visual =
              PROVIDER_VISUAL[option.key] ?? PROVIDER_VISUAL.generic_external;
            const selected = option.key === selectedProvider;
            return (
              <label
                key={option.key}
                className={clsx(
                  styles.providerCard,
                  selected && styles.providerCardSelected,
                )}
              >
                <input
                  type="radio"
                  name="providerKey"
                  value={option.key}
                  checked={selected}
                  onChange={() => setSelectedProvider(option.key)}
                  className={styles.providerRadio}
                />
                <span
                  className={styles.providerIcon}
                  style={{ backgroundColor: visual.color }}
                  aria-hidden="true"
                >
                  {visual.initial}
                </span>
                <span className={styles.providerName}>{option.name}</span>
              </label>
            );
          })}
        </div>
        {fieldErrors?.providerKey?.[0] && (
          <p className={styles.errorMessage} role="alert">
            {fieldErrors.providerKey[0]}
          </p>
        )}
      </fieldset>

      <Input
        label="Meeting link"
        name="defaultMeetingUrl"
        type="url"
        defaultValue={preference.default_meeting_url ?? ''}
        placeholder="https://"
        maxLength={500}
        hint="Paste your standing meeting URL. Leave blank to pause the default."
        error={fieldErrors?.defaultMeetingUrl?.[0]}
      />

      {generalError && (
        <p className={styles.errorMessage} role="alert">
          {generalError}
        </p>
      )}
      {state?.ok === true && (
        <p className={styles.successMessage}>Meeting link saved.</p>
      )}

      <div className={styles.formActions}>
        <Button
          type="submit"
          variant="primary"
          size="compact"
          disabled={isPending}
        >
          {isPending ? 'Saving…' : 'Save meeting link'}
        </Button>
      </div>
    </form>
  );
}
