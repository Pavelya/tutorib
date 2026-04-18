'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Button } from '@/components/Button/Button';
import {
  sendMessageAction,
  type SendMessageActionResult,
} from '@/modules/conversations/actions';
import {
  MESSAGE_BODY_MAX_CHARS,
} from '@/modules/conversations/validation';
import styles from './messages.module.css';

interface MessageComposerProps {
  conversationId: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function MessageComposer({
  conversationId,
  disabled,
  disabledReason,
}: MessageComposerProps) {
  const [state, action, isPending] = useActionState<
    SendMessageActionResult | null,
    FormData
  >(sendMessageAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      textareaRef.current?.focus();
    }
  }, [state]);

  const fieldError =
    state && !state.ok && state.code === 'validation_failed'
      ? state.fieldErrors?.body?.[0] ?? state.message
      : undefined;
  const formError =
    state && !state.ok && state.code !== 'validation_failed'
      ? state.message
      : undefined;

  if (disabled) {
    return (
      <p className={styles.pendingSendNotice}>
        {disabledReason ?? 'Messaging is unavailable in this conversation.'}
      </p>
    );
  }

  return (
    <form ref={formRef} action={action} className={styles.composerForm}>
      <input type="hidden" name="conversationId" value={conversationId} />
      <label htmlFor="messageBody" className={styles.composerLabel}>
        Reply
      </label>
      <textarea
        ref={textareaRef}
        id="messageBody"
        name="body"
        rows={3}
        required
        maxLength={MESSAGE_BODY_MAX_CHARS}
        placeholder="Write a message…"
        className={styles.composerInput}
        aria-invalid={fieldError ? true : undefined}
        aria-describedby={fieldError ? 'messageBodyError' : undefined}
        disabled={isPending}
      />
      {fieldError && (
        <p id="messageBodyError" className={styles.composerError} role="alert">
          {fieldError}
        </p>
      )}
      {formError && (
        <p className={styles.composerError} role="alert">
          {formError}
        </p>
      )}
      <div className={styles.composerActions}>
        <Button type="submit" variant="primary" size="compact" disabled={isPending}>
          {isPending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </form>
  );
}
