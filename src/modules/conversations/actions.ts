'use server';

import { revalidatePath } from 'next/cache';
import { sendMessage, markThreadRead } from './service';

export type SendMessageActionResult =
  | { ok: true; messageId: string }
  | {
      ok: false;
      code:
        | 'validation_failed'
        | 'unauthenticated'
        | 'forbidden'
        | 'not_found'
        | 'conversation_unavailable'
        | 'blocked';
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

/**
 * Persist a new message from the current participant. Authorization, block
 * checks, and validation all live in the domain service; this action only
 * adapts FormData, revalidates the messages surface, and maps the result to a
 * UI-safe shape. Message body is never logged (contracts §14).
 */
export async function sendMessageAction(
  _prevState: SendMessageActionResult | null,
  formData: FormData,
): Promise<SendMessageActionResult> {
  const conversationId = String(formData.get('conversationId') ?? '');
  const body = String(formData.get('body') ?? '');

  const result = await sendMessage({ conversationId, body });

  if (result.status === 'ok') {
    // Freshness for the thread and the conversation list (contracts §15 +
    // message architecture §13.1: in-app new-message indicator is the
    // unread + last_message_at signal on these surfaces).
    revalidatePath('/messages');
    revalidatePath('/tutor/messages');
    return { ok: true, messageId: result.message_id };
  }

  if (result.status === 'validation_failed') {
    return {
      ok: false,
      code: 'validation_failed',
      message: result.message,
      fieldErrors: { [result.field]: [result.message] },
    };
  }

  const messages: Record<Exclude<typeof result.status, 'ok' | 'validation_failed'>, string> = {
    unauthenticated: 'Sign in to send a message.',
    forbidden: 'You can’t send messages in this conversation.',
    not_found: 'Conversation not found.',
    conversation_unavailable: 'This conversation is no longer active.',
    blocked: 'Messaging is unavailable between you and this person.',
  };

  return { ok: false, code: result.status, message: messages[result.status] };
}

export type MarkThreadReadActionResult =
  | { ok: true; markedCount: number }
  | {
      ok: false;
      code:
        | 'validation_failed'
        | 'unauthenticated'
        | 'forbidden'
        | 'not_found';
    };

/**
 * Clear unread state on the current participant's view of a conversation.
 * Safe to retry: the underlying upsert is idempotent via the unique
 * (message_id, app_user_id) constraint on message_reads
 * (integration-idempotency-model §9.5).
 */
export async function markThreadReadAction(
  conversationId: string,
): Promise<MarkThreadReadActionResult> {
  const result = await markThreadRead({ conversationId });

  if (result.status === 'ok') {
    revalidatePath('/messages');
    revalidatePath('/tutor/messages');
    return { ok: true, markedCount: result.marked_count };
  }

  return { ok: false, code: result.status };
}
