'use client';

import { useEffect } from 'react';
import { markThreadReadAction } from '@/modules/conversations/actions';

/**
 * Fire-and-forget read-state update when a thread opens. The action itself is
 * idempotent (message_reads has a unique (message_id, app_user_id) constraint
 * — integration-idempotency-model §9.5), so repeat invocations are safe.
 */
export function MarkReadOnMount({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    markThreadReadAction(conversationId).catch(() => {
      // Silent: surface remains usable even if the read-state update fails.
    });
  }, [conversationId]);

  return null;
}
