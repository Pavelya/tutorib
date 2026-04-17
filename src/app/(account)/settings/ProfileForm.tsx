'use client';

import { useActionState } from 'react';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { updateProfileAction } from '@/modules/accounts/actions';
import styles from './settings.module.css';

interface ProfileFormProps {
  initialName: string | null;
  email: string;
}

export function ProfileForm({ initialName, email }: ProfileFormProps) {
  const [state, action, isPending] = useActionState(updateProfileAction, null);

  return (
    <form action={action} className={styles.profileForm}>
      <div className={styles.field}>
        <dt className={styles.label}>Email</dt>
        <dd className={styles.value}>{email}</dd>
      </div>
      <div className={styles.nameField}>
        <Input
          label="Name"
          name="fullName"
          defaultValue={initialName ?? ''}
          required
          maxLength={100}
          error={state?.ok === false ? state.message : undefined}
        />
      </div>
      {state?.ok === true && (
        <p className={styles.successMessage}>Name updated.</p>
      )}
      <div className={styles.formActions}>
        <Button type="submit" variant="primary" size="compact" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
