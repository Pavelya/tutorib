/**
 * Lesson and booking DTO types.
 *
 * Class D4 (student private) — only fields approved for an authenticated
 * student viewing their own booking context. Raw match scores, internal
 * ranking fields, and private tutor evidence are excluded.
 */

export interface BookingContextTutorDto {
  tutor_profile_id: string;
  public_slug: string;
  display_name: string;
  headline: string | null;
  pricing_summary: string | null;
}

export interface BookingContextDto {
  match_candidate_id: string;
  learning_need_id: string;
  student_profile_id: string;
  student_timezone: string;
  tutor: BookingContextTutorDto;
  subject_snapshot: string | null;
  focus_snapshot: string | null;
  minimum_notice_hours: number;
  default_price_amount: string;
  default_currency_code: string;
}

export type BookingContextResult =
  | { status: 'found'; context: BookingContextDto }
  | { status: 'not_found' }
  | { status: 'forbidden' }
  | { status: 'unauthenticated' };

export interface BookingRequestResultOk {
  ok: true;
  lesson_id: string;
  checkout_url: string;
}

export interface BookingRequestResultErr {
  ok: false;
  code:
    | 'unauthenticated'
    | 'forbidden'
    | 'not_found'
    | 'validation_failed'
    | 'provider_unavailable'
    | 'conflict';
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export type BookingRequestResult = BookingRequestResultOk | BookingRequestResultErr;
