'use client';

import { useTransition } from 'react';
import { Button } from '@/components/Button/Button';
import { markAllNotificationsReadAction } from '@/modules/notifications/actions';

export function NotificationActions() {
  const [isPending, startTransition] = useTransition();

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
    });
  }

  return (
    <Button
      variant="ghost"
      size="compact"
      onClick={handleMarkAllRead}
      disabled={isPending}
    >
      Mark all as read
    </Button>
  );
}
