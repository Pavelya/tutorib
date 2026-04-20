import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { MessagesView } from '@/components/Messages/MessagesView';
import { site } from '@/lib/config/site';
import {
  getConversationListForCurrentParticipant,
  getConversationThreadForCurrentParticipant,
} from '@/modules/conversations/service';
import type { ConversationThreadDto } from '@/modules/conversations/dto';

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

  const listResult = await getConversationListForCurrentParticipant();

  if (listResult.status === 'unauthenticated') {
    redirect('/auth/sign-in');
  }
  if (listResult.status === 'forbidden') {
    notFound();
  }

  const conversations = listResult.conversations;
  const selectedConversationId = threadParam ?? null;

  let thread: ConversationThreadDto | null = null;
  if (selectedConversationId) {
    const threadResult = await getConversationThreadForCurrentParticipant(
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
    <MessagesView
      routePrefix="/messages"
      heading="Messages"
      subheading="Continue a conversation with a tutor you've connected with."
      emptyHeading="No conversations yet"
      emptyDescription="When you message a tutor from a profile or match, your conversation will appear here."
      listEmptyHeading="No conversations yet"
      listEmptyDescription="Start a thread from a tutor profile or match."
      conversations={conversations}
      thread={thread}
      selectedConversationId={selectedConversationId}
    />
  );
}
