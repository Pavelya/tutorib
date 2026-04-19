'use client';

import { useActionState } from 'react';
import { Input } from '@/components/Input/Input';
import { Select } from '@/components/Select/Select';
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

  const defaultProvider =
    preference.provider_key ?? providerOptions[0]?.key ?? '';

  return (
    <form action={action} className={styles.form}>
      {providerOptions.length === 0 ? (
        <p className={styles.errorMessage} role="alert">
          No meeting providers are available. Contact support.
        </p>
      ) : (
        <div className={styles.formGrid}>
          <Select
            label="Provider"
            name="providerKey"
            defaultValue={defaultProvider}
            required
            error={fieldErrors?.providerKey?.[0]}
          >
            {providerOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.name}
              </option>
            ))}
          </Select>
          <Input
            label="Default meeting URL"
            name="defaultMeetingUrl"
            type="url"
            defaultValue={preference.default_meeting_url ?? ''}
            placeholder="https://"
            maxLength={500}
            hint="Must start with https://"
            error={fieldErrors?.defaultMeetingUrl?.[0]}
          />
          <Input
            label="Display label (optional)"
            name="displayLabel"
            defaultValue={preference.display_label ?? ''}
            maxLength={80}
            hint="Shown to students next to the join action."
            error={fieldErrors?.displayLabel?.[0]}
          />
        </div>
      )}

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={preference.is_active}
        />
        <span>Use this link for new lessons</span>
      </label>

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
          disabled={isPending || providerOptions.length === 0}
        >
          {isPending ? 'Saving…' : 'Save meeting link'}
        </Button>
      </div>
    </form>
  );
}
