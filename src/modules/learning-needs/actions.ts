'use server';

import { redirect } from 'next/navigation';
import { learningNeedSchema } from './validation';
import { submitLearningNeed } from './service';

export type SubmitLearningNeedActionResult = {
  ok: boolean;
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function submitLearningNeedAction(
  _prevState: SubmitLearningNeedActionResult | null,
  formData: FormData,
): Promise<SubmitLearningNeedActionResult> {
  const raw = {
    needType: formData.get('needType'),
    subjectId: formData.get('subjectId') || undefined,
    urgencyLevel: formData.get('urgencyLevel'),
    supportStyle: formData.get('supportStyle'),
    freeTextNote: formData.get('freeTextNote') || undefined,
  };

  const parsed = learningNeedSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { ok: false, code: 'validation_failed', fieldErrors };
  }

  const result = await submitLearningNeed(parsed.data);

  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }

  redirect(`/results?needId=${result.learningNeedId}`);
}
