import { redirect } from 'next/navigation';
import { resolveAccountState } from '@/modules/accounts/service';
import { RoleSelectionForm } from './RoleSelectionForm';

export default async function RoleSelectionPage() {
  const state = await resolveAccountState();

  // Unauthenticated users must sign in first
  if (state.status === 'unauthenticated') {
    redirect('/auth/sign-in');
  }

  // Users who already have a role skip setup
  if (state.status === 'student_active') {
    redirect('/match');
  }
  if (state.status === 'tutor_active' || state.status === 'tutor_pending_review') {
    redirect('/tutor/overview');
  }

  // authenticated_no_profile and authenticated_role_pending both see the role chooser
  return <RoleSelectionForm />;
}
