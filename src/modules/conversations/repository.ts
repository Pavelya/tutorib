import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import {
  conversations,
  conversationParticipants,
  messages,
  messageReads,
  userBlocks,
} from './schema';
import { appUsers } from '@/modules/accounts/schema';
import { tutorProfiles } from '@/modules/tutors/schema';

// ---------------------------------------------------------------------------
// Internal row shapes — D0, never exported to routes
// ---------------------------------------------------------------------------

export interface ConversationListRow {
  conversation_id: string;
  conversation_status: string;
  is_muted: boolean;
  is_archived: boolean;
  last_message_at: Date | null;
  last_message_id: string | null;
  counterpart_app_user_id: string;
  counterpart_full_name: string | null;
  counterpart_avatar_url: string | null;
  tutor_public_slug: string | null;
  tutor_display_name: string | null;
}

export interface ThreadHeaderRow {
  conversation_id: string;
  conversation_status: string;
  counterpart_app_user_id: string;
  counterpart_full_name: string | null;
  counterpart_avatar_url: string | null;
  tutor_public_slug: string | null;
  tutor_display_name: string | null;
}

export interface ThreadMessageRow {
  message_id: string;
  sender_app_user_id: string;
  body: string;
  message_status: string;
  edited_at: Date | null;
  removed_at: Date | null;
  created_at: Date;
}

// ---------------------------------------------------------------------------
// Participant-scoped conversation list
// ---------------------------------------------------------------------------

export async function findConversationsForParticipant(
  appUserId: string,
): Promise<ConversationListRow[]> {
  const db = getDb();

  const selfParticipant = db.$with('self_participant').as(
    db
      .select({
        conversation_id: conversationParticipants.conversation_id,
        is_muted: conversationParticipants.is_muted,
        is_archived: conversationParticipants.is_archived,
      })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.app_user_id, appUserId)),
  );

  const counterpart = db.$with('counterpart').as(
    db
      .select({
        conversation_id: conversationParticipants.conversation_id,
        app_user_id: conversationParticipants.app_user_id,
      })
      .from(conversationParticipants)
      .where(sql`${conversationParticipants.app_user_id} <> ${appUserId}`),
  );

  const rows = await db
    .with(selfParticipant, counterpart)
    .select({
      conversation_id: conversations.id,
      conversation_status: conversations.conversation_status,
      is_muted: selfParticipant.is_muted,
      is_archived: selfParticipant.is_archived,
      last_message_at: conversations.last_message_at,
      last_message_id: conversations.last_message_id,
      counterpart_app_user_id: counterpart.app_user_id,
      counterpart_full_name: appUsers.full_name,
      counterpart_avatar_url: appUsers.avatar_url,
      tutor_public_slug: tutorProfiles.public_slug,
      tutor_display_name: tutorProfiles.display_name,
    })
    .from(selfParticipant)
    .innerJoin(conversations, eq(conversations.id, selfParticipant.conversation_id))
    .innerJoin(counterpart, eq(counterpart.conversation_id, conversations.id))
    .innerJoin(appUsers, eq(appUsers.id, counterpart.app_user_id))
    .leftJoin(tutorProfiles, eq(tutorProfiles.app_user_id, counterpart.app_user_id))
    .orderBy(desc(conversations.last_message_at));

  return rows.map((r) => ({
    conversation_id: r.conversation_id,
    conversation_status: r.conversation_status,
    is_muted: r.is_muted,
    is_archived: r.is_archived,
    last_message_at: r.last_message_at,
    last_message_id: r.last_message_id,
    counterpart_app_user_id: r.counterpart_app_user_id,
    counterpart_full_name: r.counterpart_full_name,
    counterpart_avatar_url: r.counterpart_avatar_url,
    tutor_public_slug: r.tutor_public_slug,
    tutor_display_name: r.tutor_display_name,
  }));
}

// ---------------------------------------------------------------------------
// Last-message preview + unread count per conversation (batched)
// ---------------------------------------------------------------------------

export interface LastMessageRow {
  conversation_id: string;
  sender_app_user_id: string;
  body: string;
  message_status: string;
  removed_at: Date | null;
}

export async function findLastMessagesByIds(
  messageIds: string[],
): Promise<LastMessageRow[]> {
  if (messageIds.length === 0) return [];
  const db = getDb();
  const rows = await db
    .select({
      conversation_id: messages.conversation_id,
      sender_app_user_id: messages.sender_app_user_id,
      body: messages.body,
      message_status: messages.message_status,
      removed_at: messages.removed_at,
    })
    .from(messages)
    .where(inArray(messages.id, messageIds));
  return rows;
}

export interface UnreadCountRow {
  conversation_id: string;
  unread_count: number;
}

export async function findUnreadCountsForConversations(
  appUserId: string,
  conversationIds: string[],
): Promise<UnreadCountRow[]> {
  if (conversationIds.length === 0) return [];
  const db = getDb();

  const rows = await db
    .select({
      conversation_id: messages.conversation_id,
      unread_count: sql<number>`count(*)::int`,
    })
    .from(messages)
    .leftJoin(
      messageReads,
      and(
        eq(messageReads.message_id, messages.id),
        eq(messageReads.app_user_id, appUserId),
      ),
    )
    .where(
      and(
        inArray(messages.conversation_id, conversationIds),
        sql`${messages.sender_app_user_id} <> ${appUserId}`,
        isNull(messages.removed_at),
        isNull(messageReads.id),
      ),
    )
    .groupBy(messages.conversation_id);

  return rows;
}

// ---------------------------------------------------------------------------
// Block state between current user and a set of counterparts (batched)
// ---------------------------------------------------------------------------

export interface BlockRow {
  blocker_app_user_id: string;
  blocked_app_user_id: string;
}

export async function findBlocksBetween(
  appUserId: string,
  counterpartIds: string[],
): Promise<BlockRow[]> {
  if (counterpartIds.length === 0) return [];
  const db = getDb();
  const rows = await db
    .select({
      blocker_app_user_id: userBlocks.blocker_app_user_id,
      blocked_app_user_id: userBlocks.blocked_app_user_id,
    })
    .from(userBlocks)
    .where(
      and(
        eq(userBlocks.block_status, 'active'),
        or(
          and(
            eq(userBlocks.blocker_app_user_id, appUserId),
            inArray(userBlocks.blocked_app_user_id, counterpartIds),
          ),
          and(
            eq(userBlocks.blocked_app_user_id, appUserId),
            inArray(userBlocks.blocker_app_user_id, counterpartIds),
          ),
        ),
      ),
    );
  return rows;
}

// ---------------------------------------------------------------------------
// Thread header (counterpart for a single conversation, participant-scoped)
// ---------------------------------------------------------------------------

export async function findThreadHeaderForParticipant(
  conversationId: string,
  appUserId: string,
): Promise<ThreadHeaderRow | undefined> {
  const db = getDb();

  // Authorize at read time: require a participant row for this user.
  const selfRows = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversation_id, conversationId),
        eq(conversationParticipants.app_user_id, appUserId),
      ),
    )
    .limit(1);

  if (selfRows.length === 0) return undefined;

  const rows = await db
    .select({
      conversation_id: conversations.id,
      conversation_status: conversations.conversation_status,
      counterpart_app_user_id: conversationParticipants.app_user_id,
      counterpart_full_name: appUsers.full_name,
      counterpart_avatar_url: appUsers.avatar_url,
      tutor_public_slug: tutorProfiles.public_slug,
      tutor_display_name: tutorProfiles.display_name,
    })
    .from(conversations)
    .innerJoin(
      conversationParticipants,
      and(
        eq(conversationParticipants.conversation_id, conversations.id),
        sql`${conversationParticipants.app_user_id} <> ${appUserId}`,
      ),
    )
    .innerJoin(appUsers, eq(appUsers.id, conversationParticipants.app_user_id))
    .leftJoin(
      tutorProfiles,
      eq(tutorProfiles.app_user_id, conversationParticipants.app_user_id),
    )
    .where(eq(conversations.id, conversationId))
    .limit(1);

  return rows[0];
}

// ---------------------------------------------------------------------------
// Thread messages (participant-scoped, paginated by time ascending)
// ---------------------------------------------------------------------------

export async function findThreadMessages(
  conversationId: string,
  limit = 100,
): Promise<ThreadMessageRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      message_id: messages.id,
      sender_app_user_id: messages.sender_app_user_id,
      body: messages.body,
      message_status: messages.message_status,
      edited_at: messages.edited_at,
      removed_at: messages.removed_at,
      created_at: messages.created_at,
    })
    .from(messages)
    .where(eq(messages.conversation_id, conversationId))
    .orderBy(asc(messages.created_at))
    .limit(limit);
  return rows;
}

