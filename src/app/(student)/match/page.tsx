import { redirect } from 'next/navigation';
import { resolveAccountState } from '@/modules/accounts/service';
import { MatchFlowClient } from './match-flow-client';

export default async function MatchPage() {
  const state = await resolveAccountState();

  if (state.status === 'unauthenticated') {
    redirect('/auth/sign-in?next=/match');
  }

  if (
    state.status === 'authenticated_no_profile' ||
    state.status === 'authenticated_role_pending'
  ) {
    redirect('/auth/role');
  }

  if (state.status === 'tutor_active' || state.status === 'tutor_pending_review') {
    redirect('/tutor/overview');
  }

  return <MatchFlowClient />;
}
