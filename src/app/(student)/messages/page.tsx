import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import clsx from 'clsx';
import { DateTime } from 'luxon';
import { Panel } from '@/components/Panel/Panel';
import { Avatar } from '@/components/Avatar/Avatar';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { InlineNotice } from '@/components/InlineNotice/InlineNotice';
import { site } from '@/lib/config/site';
import {
  getConversationListForStudent,
  getConversationThreadForStudent,
} from '@/modules/conversations/service';
import type {
  ConversationListItemDto,
  ConversationThreadDto,
} from '@/modules/conversations/dto';
import styles from './messages.module.css';

export const metadata: Metadata = {
  title: `Messages — ${site.name}`,
  robots: { index: false, follow: false },
};

interface MessagesPageProps {
  searchParams: Promise<{ thread?: string }>;
}

export default async function StudentMessagesPage({
  searchParams,
}: MessagesPageProps) {
  const { thread: threadParam } = await searchParams;

  const listResult = await getConversationListForStudent();

  if (listResult.status === 'unauthenticated') {
    redirect('/auth/sign-in');
  }
  if (listResult.status === 'forbidden') {
    notFound();
  }

  const conversations = listResult.conversations;
  const selectedConversationId = threadParam ?? null;

  // When a thread is selected, load it through the participant-scoped service.
  // Unauthorized or unknown threads collapse to 404 (DTO §27).
  let thread: ConversationThreadDto | null = null;
  if (selectedConversationId) {
    const threadResult = await getConversationThreadForStudent(
      selectedConversationId,
    );
    if (threadResult.status === 'unauthenticated') {
      redirect('/auth/sign-in');
    }
    if (threadResult.status === 'not_found') {
      notFound();
    }
    if (threadResult.status === 'forbidden') {
      notFound();
    }
    thread = threadResult.thread;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Messages</h1>
        <p className={styles.subheading}>
          Continue a conversation with a tutor you&apos;ve connected with.
        </p>
      </header>

      {conversations.length === 0 && !selectedConversationId ? (
        <EmptyState
          heading="No conversations yet"
          description="When you message a tutor from a profile or match, your conversation will appear here."
        />
      ) : (
        <div className={styles.shell} data-thread-open={thread ? 'true' : 'false'}>
          <Panel as="aside" variant="default" className={styles.listColumn}>
            {conversations.length === 0 ? (
              <div className={styles.listColumnBody}>
                <EmptyState
                  heading="No conversations yet"
                  description="Start a thread from a tutor profile or match."
                />
              </div>
            ) : (
              <ul className={styles.listColumnBody}>
                {conversations.map((c) => (
                  <li key={c.conversation_id}>
                    <ConversationRow
                      conversation={c}
                      isSelected={c.conversation_id === selectedConversationId}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel as="section" variant="default" className={styles.threadColumn}>
            {thread ? (
              <ThreadView thread={thread} />
            ) : (
              <div className={styles.threadBody}>
                <EmptyState
                  heading="Select a conversation"
                  description="Pick a thread from the list to read your messages."
                />
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

function ConversationRow({
  conversation,
  isSelected,
}: {
  conversation: ConversationListItemDto;
  isSelected: boolean;
}) {
  const {
    counterpart,
    last_message_preview,
    last_message_from_self,
    last_message_at,
    unread_count,
    is_archived,
    is_muted,
    is_blocked_by_self,
    conversation_status,
  } = conversation;

  const previewText =
    last_message_preview === null
      ? 'Message unavailable'
      : last_message_from_self
        ? `You: ${last_message_preview}`
        : last_message_preview;
  const previewMuted = last_message_preview === null;

  return (
    <Link
      href={`/messages?thread=${conversation.conversation_id}`}
      className={clsx(
        styles.conversationLink,
        isSelected && styles.conversationLinkSelected,
      )}
      aria-current={isSelected ? 'true' : undefined}
    >
      <Avatar
        size="md"
        name={counterpart.display_name}
        src={counterpart.avatar_url ?? undefined}
      />
      <div className={styles.conversationBody}>
        <div className={styles.conversationTop}>
          <span className={styles.conversationName}>
            {counterpart.display_name}
          </span>
          {last_message_at && (
            <time
              className={styles.conversationTime}
              dateTime={last_message_at}
            >
              {formatRelativeDay(last_message_at)}
            </time>
          )}
        </div>
        {previewText && (
          <p
            className={clsx(
              styles.conversationPreview,
              previewMuted && styles.conversationPreviewMuted,
            )}
          >
            {previewText}
          </p>
        )}
        <div className={styles.conversationMeta}>
          {unread_count > 0 && !is_muted && (
            <span
              className={styles.unreadBadge}
              aria-label={`${unread_count} unread`}
            >
              {unread_count}
            </span>
          )}
          {is_muted && <span className={styles.mutedTag}>Muted</span>}
          {is_archived && <span className={styles.archivedTag}>Archived</span>}
          {is_blocked_by_self && (
            <span className={styles.archivedTag}>Blocked</span>
          )}
          {conversation_status === 'blocked' && !is_blocked_by_self && (
            <span className={styles.archivedTag}>Unavailable</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ThreadView({ thread }: { thread: ConversationThreadDto }) {
  const { counterpart } = thread;

  return (
    <div className={styles.thread}>
      <header className={styles.threadHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link href="/messages" className={styles.threadBackLink}>
            ← All conversations
          </Link>
          <Avatar
            size="sm"
            name={counterpart.display_name}
            src={counterpart.avatar_url ?? undefined}
          />
          <div>
            <p className={styles.conversationName}>{counterpart.display_name}</p>
            {counterpart.tutor_public_slug && (
              <Link
                href={`/tutors/${counterpart.tutor_public_slug}`}
                className={styles.conversationPreview}
              >
                View profile
              </Link>
            )}
          </div>
        </div>
        <div className={styles.threadHeaderActions}>
          <SafetyEntry
            conversationId={thread.conversation_id}
            isBlockedBySelf={thread.is_blocked_by_self}
          />
        </div>
      </header>

      <div className={styles.threadBody} aria-live="polite">
        {thread.is_blocked_by_self && (
          <InlineNotice variant="warning">
            You&apos;ve blocked this person. They can&apos;t send you new messages.
          </InlineNotice>
        )}
        {thread.is_blocked_by_counterpart && !thread.is_blocked_by_self && (
          <InlineNotice variant="info">
            This conversation is unavailable right now.
          </InlineNotice>
        )}

        {thread.messages.length === 0 ? (
          <EmptyState
            heading="No messages yet"
            description="This conversation is ready for its first message."
          />
        ) : (
          thread.messages.map((m) => (
            <div
              key={m.message_id}
              className={clsx(
                styles.messageRow,
                m.sender_role === 'self'
                  ? styles.messageRowSelf
                  : styles.messageRowCounterpart,
              )}
            >
              {m.is_removed ? (
                <div
                  className={clsx(styles.messageBubble, styles.messageRemoved)}
                >
                  Message removed
                </div>
              ) : (
                <div
                  className={clsx(
                    styles.messageBubble,
                    m.sender_role === 'self'
                      ? styles.messageBubbleSelf
                      : styles.messageBubbleCounterpart,
                  )}
                >
                  {m.body}
                </div>
              )}
              <time className={styles.messageMeta} dateTime={m.created_at}>
                {formatMessageTime(m.created_at)}
                {m.is_edited && !m.is_removed ? ' · edited' : ''}
              </time>
            </div>
          ))
        )}
      </div>

      <footer className={styles.threadFooter}>
        {/*
          Message send lives in P1-MSG-002; this entry keeps the UI coherent
          without shipping a write path this task doesn't own.
        */}
        <p className={styles.pendingSendNotice}>
          Replying will be available shortly.
        </p>
      </footer>
    </div>
  );
}

function SafetyEntry({
  isBlockedBySelf,
}: {
  conversationId: string;
  isBlockedBySelf: boolean;
}) {
  return (
    <details className={styles.safetyDetails}>
      <summary className={styles.safetySummary}>Safety</summary>
      <div className={styles.safetyBody}>
        <InlineNotice variant="info">
          If something in this conversation feels wrong, you&apos;ll be able to
          block this person or report it to our trust &amp; safety team. These
          actions will be enabled shortly.
        </InlineNotice>
        <div className={styles.safetyActions}>
          <button
            type="button"
            className={styles.safetySummary}
            aria-disabled="true"
            disabled
          >
            {isBlockedBySelf ? 'Manage block' : 'Block this person'}
          </button>
          <button
            type="button"
            className={styles.safetySummary}
            aria-disabled="true"
            disabled
          >
            Report conversation
          </button>
        </div>
      </div>
    </details>
  );
}

function formatRelativeDay(iso: string): string {
  const dt = DateTime.fromISO(iso);
  if (!dt.isValid) return '';
  const now = DateTime.now();
  if (dt.hasSame(now, 'day')) return dt.toFormat('h:mm a');
  if (dt.hasSame(now.minus({ days: 1 }), 'day')) return 'Yesterday';
  if (dt > now.minus({ days: 7 })) return dt.toFormat('ccc');
  return dt.toFormat('LLL d');
}

function formatMessageTime(iso: string): string {
  const dt = DateTime.fromISO(iso);
  if (!dt.isValid) return '';
  const now = DateTime.now();
  if (dt.hasSame(now, 'day')) return dt.toFormat('h:mm a');
  return dt.toFormat('LLL d, h:mm a');
}
