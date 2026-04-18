import { Resend } from 'resend';
import { getServerEnv } from '@/lib/env/server';

let _resend: Resend | undefined;

export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(getServerEnv().RESEND_API_KEY);
  }
  return _resend;
}
