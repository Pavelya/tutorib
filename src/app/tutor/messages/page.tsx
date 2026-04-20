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

interface TutorMessagesPageProps {
  searchParams: Promise<{ thread?: string }>;
}

export default async function TutorMessagesPage({
  searchParams,
}: TutorMessagesPageProps) {
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
      routePrefix="/tutor/messages"
      heading="Messages"
      subheading="Stay in touch with students who have reached out."
      emptyHeading="No conversations yet"
      emptyDescription="When a student starts a conversation with you, it will appear here."
      listEmptyHeading="No conversations yet"
      listEmptyDescription="Conversations from students will appear here."
      conversations={conversations}
      thread={thread}
      selectedConversationId={selectedConversationId}
    />
  );
}
