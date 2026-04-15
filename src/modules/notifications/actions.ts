'use server';

import { revalidatePath } from 'next/cache';
import { resolveAccountState } from '@/modules/accounts/service';
import { markRead, markAllRead, dismissLegalNotice } from './service';

export type NotificationActionResult = {
  ok: boolean;
  code?: string;
  message?: string;
};

/**
 * Mark a single notification as read.
 */
export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  const state = await resolveAccountState();
  if (state.status === 'unauthenticated' || !('appUser' in state)) {
    return { ok: false, code: 'unauthenticated', message: 'Sign in required.' };
  }

  const updated = await markRead(notificationId, state.appUser.id);
  if (!updated) {
    return { ok: false, code: 'not_found', message: 'Notification not found.' };
  }

  revalidatePath('/notifications');
  return { ok: true };
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  const state = await resolveAccountState();
  if (state.status === 'unauthenticated' || !('appUser' in state)) {
    return { ok: false, code: 'unauthenticated', message: 'Sign in required.' };
  }

  await markAllRead(state.appUser.id);
  revalidatePath('/notifications');
  return { ok: true };
}

/**
 * Dismiss a legal notice banner (mark as viewed or acknowledged).
 */
export async function dismissLegalNoticeAction(
  policyNoticeVersionId: string,
  acknowledge: boolean,
): Promise<NotificationActionResult> {
  const state = await resolveAccountState();
  if (state.status === 'unauthenticated' || !('appUser' in state)) {
    return { ok: false, code: 'unauthenticated', message: 'Sign in required.' };
  }

  await dismissLegalNotice(policyNoticeVersionId, state.appUser.id, acknowledge);
  revalidatePath('/notifications');
  revalidatePath('/settings');
  return { ok: true };
}
