/**
 * Conversation and message DTO types.
 *
 * Classes:
 * - D4 / D6 (participant-scoped, student-side) — only fields approved for a
 *   signed-in student viewing conversations they participate in.
 *
 * Per the message architecture, route-facing data crosses the boundary as
 * these minimal shapes — never as raw Drizzle rows.
 */

// ---------------------------------------------------------------------------
// Counterpart summary (participant-safe display for the other party)
// ---------------------------------------------------------------------------

export interface ConversationCounterpartDto {
  app_user_id: string;
  display_name: string;
  avatar_url: string | null;
  tutor_public_slug: string | null;
}

// ---------------------------------------------------------------------------
// D4/D6: Conversation list entry (student sidebar)
// ---------------------------------------------------------------------------

export interface ConversationListItemDto {
  conversation_id: string;
  conversation_status: 'active' | 'blocked' | 'archived';
  counterpart: ConversationCounterpartDto;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_from_self: boolean;
  unread_count: number;
  is_muted: boolean;
  is_archived: boolean;
  is_blocked_by_self: boolean;
}

// ---------------------------------------------------------------------------
// D6: Message thread entry
// ---------------------------------------------------------------------------

export interface ThreadMessageDto {
  message_id: string;
  sender_role: 'self' | 'counterpart';
  body: string | null;
  is_removed: boolean;
  is_edited: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// D6: Full thread view
// ---------------------------------------------------------------------------

export interface ConversationThreadDto {
  conversation_id: string;
  conversation_status: 'active' | 'blocked' | 'archived';
  counterpart: ConversationCounterpartDto;
  is_blocked_by_self: boolean;
  is_blocked_by_counterpart: boolean;
  messages: ThreadMessageDto[];
}

// ---------------------------------------------------------------------------
// Result shapes with explicit absence/denial states
// ---------------------------------------------------------------------------

export type ConversationListResult =
  | { status: 'ok'; conversations: ConversationListItemDto[] }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };

export type ConversationThreadResult =
  | { status: 'ok'; thread: ConversationThreadDto }
  | { status: 'not_found' }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };

// ---------------------------------------------------------------------------
// Mutation results (Server Action boundary shapes)
// ---------------------------------------------------------------------------

export type SendMessageResult =
  | { status: 'ok'; message_id: string; created_at: string }
  | { status: 'validation_failed'; field: string; message: string }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'conversation_unavailable' }
  | { status: 'blocked' };

export type MarkThreadReadResult =
  | { status: 'ok'; marked_count: number }
  | { status: 'validation_failed' }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'not_found' };
