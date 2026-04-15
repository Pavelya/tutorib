'use client';

import { useActionState } from 'react';
import { selectRoleAction, type SelectRoleResult } from '@/modules/accounts/actions';
import styles from './role-selection.module.css';

export function RoleSelectionForm() {
  const [state, formAction, isPending] = useActionState<SelectRoleResult | null, FormData>(
    selectRoleAction,
    null,
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>How will you use Mentor IB?</h1>
        <p className={styles.subtitle}>
          Choose how you&apos;d like to get started. You can always add the other role later.
        </p>
      </div>

      {state && !state.ok && state.message && (
        <div className={styles.error} role="alert">
          {state.message}
        </div>
      )}

      <div className={styles.options}>
        <form action={formAction}>
          <input type="hidden" name="role" value="student" />
          <button type="submit" className={styles.roleCard} disabled={isPending}>
            <span className={styles.roleIcon} aria-hidden="true">
              📚
            </span>
            <span className={styles.roleLabel}>I&apos;m a student</span>
            <span className={styles.roleDescription}>
              Find an IB mentor matched to your learning needs
            </span>
          </button>
        </form>

        <form action={formAction}>
          <input type="hidden" name="role" value="tutor" />
          <button type="submit" className={styles.roleCard} disabled={isPending}>
            <span className={styles.roleIcon} aria-hidden="true">
              🎓
            </span>
            <span className={styles.roleLabel}>I&apos;m a tutor</span>
            <span className={styles.roleDescription}>
              Help IB students succeed and grow your tutoring practice
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
