import { resolveAccountState } from '@/modules/accounts/service';
import { findStudentProfileByAppUserId } from '@/modules/learning-needs/repository';
import {
  findConversationsForParticipant,
  findLastMessagesByIds,
  findUnreadCountsForConversations,
  findBlocksBetween,
  findThreadHeaderForParticipant,
  findThreadMessages,
  type ConversationListRow,
  type LastMessageRow,
  type ThreadHeaderRow,
  type ThreadMessageRow,
} from './repository';
import type {
  ConversationListItemDto,
  ConversationListResult,
  ConversationThreadDto,
  ConversationThreadResult,
  ThreadMessageDto,
  ConversationCounterpartDto,
} from './dto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// How many characters of the last message to expose as a preview in the list.
// Short previews reduce collateral exposure if a row ever renders out of scope.
const LIST_PREVIEW_MAX_CHARS = 140;

// Most recent messages returned to the thread view on first render.
// Phase 1 is text-only, one-to-one, low volume (architecture §12).
const THREAD_MESSAGE_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Public service API
// ---------------------------------------------------------------------------

export async function getConversationListForStudent(): Promise<ConversationListResult> {
  const state = await resolveAccountState();

  if (state.status === 'unauthenticated') {
    return { status: 'unauthenticated' };
  }

  if (state.status !== 'student_active') {
    return { status: 'forbidden' };
  }

  const studentProfile = await findStudentProfileByAppUserId(state.appUser.id);
  if (!studentProfile) {
    return { status: 'forbidden' };
  }

  const rows = await findConversationsForParticipant(state.appUser.id);

  if (rows.length === 0) {
    return { status: 'ok', conversations: [] };
  }

  const conversationIds = rows.map((r) => r.conversation_id);
  const counterpartIds = rows.map((r) => r.counterpart_app_user_id);
  const lastMessageIds = rows
    .map((r) => r.last_message_id)
    .filter((id): id is string => Boolean(id));

  const [lastMessages, unreadCounts, blocks] = await Promise.all([
    findLastMessagesByIds(lastMessageIds),
    findUnreadCountsForConversations(state.appUser.id, conversationIds),
    findBlocksBetween(state.appUser.id, counterpartIds),
  ]);

  const lastMessageById = new Map<string, LastMessageRow>();
  for (const m of lastMessages) {
    lastMessageById.set(m.conversation_id, m);
  }

  const unreadByConversation = new Map<string, number>();
  for (const u of unreadCounts) {
    unreadByConversation.set(u.conversation_id, u.unread_count);
  }

  const blockedByMe = new Set<string>();
  for (const b of blocks) {
    if (b.blocker_app_user_id === state.appUser.id) {
      blockedByMe.add(b.blocked_app_user_id);
    }
  }

  const conversationsDto: ConversationListItemDto[] = rows.map((r) =>
    toListItemDto(r, {
      lastMessage: r.last_message_id
        ? lastMessageById.get(r.conversation_id)
        : undefined,
      unreadCount: unreadByConversation.get(r.conversation_id) ?? 0,
      selfAppUserId: state.appUser.id,
      isBlockedBySelf: blockedByMe.has(r.counterpart_app_user_id),
    }),
  );

  return { status: 'ok', conversations: conversationsDto };
}

export async function getConversationThreadForStudent(
  conversationId: string,
): Promise<ConversationThreadResult> {
  const state = await resolveAccountState();

  if (state.status === 'unauthenticated') {
    return { status: 'unauthenticated' };
  }

  if (state.status !== 'student_active') {
    return { status: 'forbidden' };
  }

  const studentProfile = await findStudentProfileByAppUserId(state.appUser.id);
  if (!studentProfile) {
    return { status: 'forbidden' };
  }

  const header = await findThreadHeaderForParticipant(
    conversationId,
    state.appUser.id,
  );

  // Unauthorized / non-existent threads collapse to 404 posture (DTO §27).
  if (!header) {
    return { status: 'not_found' };
  }

  const [threadMessages, blocks] = await Promise.all([
    findThreadMessages(conversationId, THREAD_MESSAGE_PAGE_SIZE),
    findBlocksBetween(state.appUser.id, [header.counterpart_app_user_id]),
  ]);

  const blockedBySelf = blocks.some(
    (b) => b.blocker_app_user_id === state.appUser.id,
  );
  const blockedByCounterpart = blocks.some(
    (b) => b.blocker_app_user_id === header.counterpart_app_user_id,
  );

  const thread: ConversationThreadDto = {
    conversation_id: header.conversation_id,
    conversation_status: normalizeConversationStatus(header.conversation_status),
    counterpart: toCounterpartDto(header),
    is_blocked_by_self: blockedBySelf,
    is_blocked_by_counterpart: blockedByCounterpart,
    messages: threadMessages.map((m) =>
      toThreadMessageDto(m, state.appUser.id),
    ),
  };

  return { status: 'ok', thread };
}

// ---------------------------------------------------------------------------
// DTO shaping helpers
// ---------------------------------------------------------------------------

function toListItemDto(
  row: ConversationListRow,
  context: {
    lastMessage: LastMessageRow | undefined;
    unreadCount: number;
    selfAppUserId: string;
    isBlockedBySelf: boolean;
  },
): ConversationListItemDto {
  const counterpart = toCounterpartDto(row);
  const { lastMessage } = context;

  const preview = lastMessage ? buildPreview(lastMessage) : null;
  const lastFromSelf = lastMessage
    ? lastMessage.sender_app_user_id === context.selfAppUserId
    : false;

  return {
    conversation_id: row.conversation_id,
    conversation_status: normalizeConversationStatus(row.conversation_status),
    counterpart,
    last_message_at: row.last_message_at
      ? row.last_message_at.toISOString()
      : null,
    last_message_preview: preview,
    last_message_from_self: lastFromSelf,
    unread_count: context.unreadCount,
    is_muted: row.is_muted,
    is_archived: row.is_archived,
    is_blocked_by_self: context.isBlockedBySelf,
  };
}

function toCounterpartDto(
  row: Pick<
    ConversationListRow | ThreadHeaderRow,
    | 'counterpart_app_user_id'
    | 'counterpart_full_name'
    | 'counterpart_avatar_url'
    | 'tutor_public_slug'
    | 'tutor_display_name'
  >,
): ConversationCounterpartDto {
  // Prefer the tutor's public display name when the counterpart is a tutor,
  // so the sidebar matches what the student saw on the profile surface.
  const displayName =
    row.tutor_display_name ?? row.counterpart_full_name ?? 'Tutor';

  return {
    app_user_id: row.counterpart_app_user_id,
    display_name: displayName,
    avatar_url: row.counterpart_avatar_url,
    tutor_public_slug: row.tutor_public_slug,
  };
}

function toThreadMessageDto(
  row: ThreadMessageRow,
  selfAppUserId: string,
): ThreadMessageDto {
  const isRemoved =
    row.removed_at !== null || row.message_status === 'removed';

  return {
    message_id: row.message_id,
    sender_role: row.sender_app_user_id === selfAppUserId ? 'self' : 'counterpart',
    body: isRemoved ? null : row.body,
    is_removed: isRemoved,
    is_edited: row.edited_at !== null || row.message_status === 'edited',
    created_at: row.created_at.toISOString(),
  };
}

function buildPreview(last: LastMessageRow): string | null {
  if (last.removed_at !== null || last.message_status === 'removed') {
    return null;
  }
  const body = last.body.trim();
  if (body.length <= LIST_PREVIEW_MAX_CHARS) return body;
  return body.slice(0, LIST_PREVIEW_MAX_CHARS) + '…';
}

function normalizeConversationStatus(
  value: string,
): 'active' | 'blocked' | 'archived' {
  if (value === 'blocked' || value === 'archived') return value;
  return 'active';
}
