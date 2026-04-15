import { resolveAccountState } from '@/modules/accounts/service';
import { findStudentProfileByAppUserId, createLearningNeed } from './repository';
import type { LearningNeedInput } from './validation';

export type SubmitNeedResult =
  | { ok: true; learningNeedId: string }
  | { ok: false; code: string; message: string };

export async function submitLearningNeed(
  input: LearningNeedInput,
): Promise<SubmitNeedResult> {
  const state = await resolveAccountState();

  if (state.status !== 'student_active') {
    return { ok: false, code: 'forbidden', message: 'Only active students can submit a learning need.' };
  }

  const studentProfile = await findStudentProfileByAppUserId(state.appUser.id);

  if (!studentProfile) {
    return { ok: false, code: 'not_found', message: 'Student profile not found.' };
  }

  const need = await createLearningNeed({
    studentProfileId: studentProfile.id,
    needType: input.needType,
    subjectId: input.subjectId,
    urgencyLevel: input.urgencyLevel,
    supportStyle: input.supportStyle,
    freeTextNote: input.freeTextNote,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  return { ok: true, learningNeedId: need.id };
}
