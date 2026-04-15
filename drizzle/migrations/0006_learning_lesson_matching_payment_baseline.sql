-- P1-DATA-003: Learning needs, matching, lessons, and payment schema baseline
-- Category A: additive schema change
-- Tables: learning_needs, match_runs, match_candidates, lessons,
--         lesson_status_history, lesson_meeting_access, lesson_reports,
--         lesson_issue_cases, payments, earnings
-- RLS: Type B participant/owner-scoped throughout

-- =========================================================================
-- LEARNING NEEDS
-- =========================================================================

-- ---------------------------------------------------------------------------
-- learning_needs — normalized record of a student's IB support request
-- ---------------------------------------------------------------------------
CREATE TABLE learning_needs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id       uuid NOT NULL REFERENCES student_profiles(id),
  need_status              text NOT NULL DEFAULT 'active',
  need_type                text NOT NULL,
  subject_id               uuid REFERENCES subjects(id),
  subject_focus_area_id    uuid REFERENCES subject_focus_areas(id),
  urgency_level            text,
  support_style            text,
  language_code            text REFERENCES languages(code),
  timezone                 text,
  session_frequency_intent text,
  free_text_note           text,
  submitted_at             timestamptz NOT NULL DEFAULT now(),
  archived_at              timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_learning_needs_student ON learning_needs (student_profile_id);
CREATE INDEX idx_learning_needs_status ON learning_needs (need_status);
CREATE INDEX idx_learning_needs_subject ON learning_needs (subject_id);

CREATE TRIGGER learning_needs_updated_at
  BEFORE UPDATE ON learning_needs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: owning student read/write
ALTER TABLE learning_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY learning_needs_select_own ON learning_needs
  FOR SELECT
  USING (
    student_profile_id IN (
      SELECT id FROM student_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY learning_needs_update_own ON learning_needs
  FOR UPDATE
  USING (
    student_profile_id IN (
      SELECT id FROM student_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    student_profile_id IN (
      SELECT id FROM student_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Insert/delete are server-only (service role)

-- =========================================================================
-- MATCHING
-- =========================================================================

-- ---------------------------------------------------------------------------
-- match_runs — versioned record of a matching execution for a learning need
-- ---------------------------------------------------------------------------
CREATE TABLE match_runs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_need_id            uuid NOT NULL REFERENCES learning_needs(id),
  ranking_version             text NOT NULL,
  need_signature              text,
  matching_projection_version text,
  run_status                  text NOT NULL DEFAULT 'pending',
  candidate_count             integer,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_runs_learning_need ON match_runs (learning_need_id);
CREATE INDEX idx_match_runs_status ON match_runs (run_status);

-- RLS: owning student read
ALTER TABLE match_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY match_runs_select_own ON match_runs
  FOR SELECT
  USING (
    learning_need_id IN (
      SELECT id FROM learning_needs WHERE student_profile_id IN (
        SELECT id FROM student_profiles WHERE app_user_id IN (
          SELECT id FROM app_users WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

-- Insert/update are server-only (service role)

-- ---------------------------------------------------------------------------
-- match_candidates — one candidate tutor result within a match run
-- ---------------------------------------------------------------------------
CREATE TABLE match_candidates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_run_id          uuid NOT NULL REFERENCES match_runs(id),
  tutor_profile_id      uuid NOT NULL REFERENCES tutor_profiles(id),
  candidate_state       text NOT NULL DEFAULT 'candidate',
  rank_position         integer NOT NULL,
  match_score           numeric,
  confidence_label      text,
  fit_summary           text,
  best_for_summary      text,
  availability_signal   text,
  trust_signal_snapshot text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_candidates_run ON match_candidates (match_run_id);
CREATE INDEX idx_match_candidates_tutor ON match_candidates (tutor_profile_id);
CREATE INDEX idx_match_candidates_state ON match_candidates (candidate_state);

CREATE TRIGGER match_candidates_updated_at
  BEFORE UPDATE ON match_candidates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: owning student read
ALTER TABLE match_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY match_candidates_select_own ON match_candidates
  FOR SELECT
  USING (
    match_run_id IN (
      SELECT id FROM match_runs WHERE learning_need_id IN (
        SELECT id FROM learning_needs WHERE student_profile_id IN (
          SELECT id FROM student_profiles WHERE app_user_id IN (
            SELECT id FROM app_users WHERE auth_user_id = auth.uid()
          )
        )
      )
    )
  );

-- Insert/update are server-only (service role)

-- =========================================================================
-- LESSONS AND BOOKING
-- =========================================================================

-- ---------------------------------------------------------------------------
-- lessons — single canonical operational object for booking requests, confirmed
-- lessons, upcoming sessions, and completed lesson history
-- ---------------------------------------------------------------------------
CREATE TABLE lessons (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id      uuid NOT NULL REFERENCES student_profiles(id),
  tutor_profile_id        uuid NOT NULL REFERENCES tutor_profiles(id),
  learning_need_id        uuid REFERENCES learning_needs(id),
  match_candidate_id      uuid REFERENCES match_candidates(id),
  lesson_status           text NOT NULL DEFAULT 'requested',
  scheduled_start_at      timestamptz NOT NULL,
  scheduled_end_at        timestamptz NOT NULL,
  request_expires_at      timestamptz,
  lesson_timezone         text NOT NULL,
  meeting_method          text,
  price_amount            numeric,
  currency_code           text DEFAULT 'USD',
  is_trial                boolean NOT NULL DEFAULT false,
  subject_snapshot        text,
  focus_snapshot          text,
  student_note_snapshot   text,
  accepted_at             timestamptz,
  declined_at             timestamptz,
  cancelled_at            timestamptz,
  cancelled_by_app_user_id uuid REFERENCES app_users(id),
  completed_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lessons_student ON lessons (student_profile_id);
CREATE INDEX idx_lessons_tutor ON lessons (tutor_profile_id);
CREATE INDEX idx_lessons_status ON lessons (lesson_status);
CREATE INDEX idx_lessons_scheduled_start ON lessons (scheduled_start_at);
CREATE INDEX idx_lessons_tutor_status ON lessons (tutor_profile_id, lesson_status);

CREATE TRIGGER lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: participant-only read (student or tutor on the lesson)
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY lessons_select_participant ON lessons
  FOR SELECT
  USING (
    student_profile_id IN (
      SELECT id FROM student_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
    OR
    tutor_profile_id IN (
      SELECT id FROM tutor_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Insert/update/delete are server-only (service role)

-- ---------------------------------------------------------------------------
-- lesson_status_history — durable transition history for lesson-state changes
-- ---------------------------------------------------------------------------
CREATE TABLE lesson_status_history (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id               uuid NOT NULL REFERENCES lessons(id),
  from_status             text,
  to_status               text NOT NULL,
  changed_by_app_user_id  uuid REFERENCES app_users(id),
  change_reason           text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_status_history_lesson ON lesson_status_history (lesson_id);

-- RLS: participant-readable through lesson access
ALTER TABLE lesson_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY lesson_status_history_select_participant ON lesson_status_history
  FOR SELECT
  USING (
    lesson_id IN (
      SELECT id FROM lessons WHERE
        student_profile_id IN (
          SELECT id FROM student_profiles WHERE app_user_id IN (
            SELECT id FROM app_users WHERE auth_user_id = auth.uid()
          )
        )
        OR
        tutor_profile_id IN (
          SELECT id FROM tutor_profiles WHERE app_user_id IN (
            SELECT id FROM app_users WHERE auth_user_id = auth.uid()
          )
        )
    )
  );

-- Insert is server-only (service role)

-- ---------------------------------------------------------------------------
-- lesson_meeting_access — lesson-scoped access record for external meeting links
-- ---------------------------------------------------------------------------
CREATE TABLE lesson_meeting_access (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id               uuid NOT NULL REFERENCES lessons(id),
  provider                text NOT NULL,
  meeting_url             text,
  normalized_host         text,
  access_status           text NOT NULL DEFAULT 'active',
  updated_by_app_user_id  uuid REFERENCES app_users(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_meeting_access_lesson ON lesson_meeting_access (lesson_id);

CREATE TRIGGER lesson_meeting_access_updated_at
  BEFORE UPDATE ON lesson_meeting_access
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: lesson participants only
ALTER TABLE lesson_meeting_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY lesson_meeting_access_select_participant ON lesson_meeting_access
  FOR SELECT
  USING (
    lesson_id IN (
      SELECT id FROM lessons WHERE
        student_profile_id IN (
          SELECT id FROM student_profiles WHERE app_user_id IN (
            SELECT id FROM app_users WHERE auth_user_id = auth.uid()
          )
        )
        OR
        tutor_profile_id IN (
          SELECT id FROM tutor_profiles WHERE app_user_id IN (
            SELECT id FROM app_users WHERE auth_user_id = auth.uid()
          )
        )
    )
  );

-- Insert/update are server-only (service role)

-- ---------------------------------------------------------------------------
-- lesson_reports — private post-lesson continuity record written by the tutor
-- ---------------------------------------------------------------------------
CREATE TABLE lesson_reports (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id                 uuid NOT NULL REFERENCES lessons(id),
  report_status             text NOT NULL DEFAULT 'draft',
  goal_summary              text,
  coverage_summary          text,
  student_confidence_signal text,
  next_steps_summary        text,
  student_visible_at        timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_reports_lesson ON lesson_reports (lesson_id);

CREATE TRIGGER lesson_reports_updated_at
  BEFORE UPDATE ON lesson_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: tutor full access, student read only when shared
ALTER TABLE lesson_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY lesson_reports_select_tutor ON lesson_reports
  FOR SELECT
  USING (
    lesson_id IN (
      SELECT id FROM lessons WHERE tutor_profile_id IN (
        SELECT id FROM tutor_profiles WHERE app_user_id IN (
          SELECT id FROM app_users WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY lesson_reports_select_student_shared ON lesson_reports
  FOR SELECT
  USING (
    student_visible_at IS NOT NULL
    AND student_visible_at <= now()
    AND lesson_id IN (
      SELECT id FROM lessons WHERE student_profile_id IN (
        SELECT id FROM student_profiles WHERE app_user_id IN (
          SELECT id FROM app_users WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

-- Insert/update are server-only (service role)

-- ---------------------------------------------------------------------------
-- lesson_issue_cases — operational case for no-show, wrong-link, technical
-- failure, or partial-delivery incidents linked to a lesson
-- ---------------------------------------------------------------------------
CREATE TABLE lesson_issue_cases (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id               uuid NOT NULL REFERENCES lessons(id),
  case_status             text NOT NULL DEFAULT 'open',
  student_claim_type      text,
  student_reported_at     timestamptz,
  tutor_claim_type        text,
  tutor_reported_at       timestamptz,
  resolution_outcome      text,
  resolution_note         text,
  resolved_by_app_user_id uuid REFERENCES app_users(id),
  resolved_at             timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_issue_cases_lesson ON lesson_issue_cases (lesson_id);
CREATE INDEX idx_lesson_issue_cases_status ON lesson_issue_cases (case_status);

CREATE TRIGGER lesson_issue_cases_updated_at
  BEFORE UPDATE ON lesson_issue_cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: lesson participants only
ALTER TABLE lesson_issue_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY lesson_issue_cases_select_participant ON lesson_issue_cases
  FOR SELECT
  USING (
    lesson_id IN (
      SELECT id FROM lessons WHERE
        student_profile_id IN (
          SELECT id FROM student_profiles WHERE app_user_id IN (
            SELECT id FROM app_users WHERE auth_user_id = auth.uid()
          )
        )
        OR
        tutor_profile_id IN (
          SELECT id FROM tutor_profiles WHERE app_user_id IN (
            SELECT id FROM app_users WHERE auth_user_id = auth.uid()
          )
        )
    )
  );

-- Insert/update are server-only (service role)

-- =========================================================================
-- PAYMENTS AND EARNINGS
-- =========================================================================

-- ---------------------------------------------------------------------------
-- payments — application-facing payment record tied to Stripe lifecycle
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id                   uuid NOT NULL REFERENCES lessons(id),
  payer_app_user_id           uuid NOT NULL REFERENCES app_users(id),
  stripe_checkout_session_id  text,
  stripe_payment_intent_id    text,
  payment_status              text NOT NULL DEFAULT 'pending',
  amount                      numeric NOT NULL,
  currency_code               text NOT NULL DEFAULT 'USD',
  authorized_at               timestamptz,
  authorization_expires_at    timestamptz,
  captured_at                 timestamptz,
  capture_cancelled_at        timestamptz,
  refunded_at                 timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_lesson ON payments (lesson_id);
CREATE INDEX idx_payments_payer ON payments (payer_app_user_id);
CREATE INDEX idx_payments_status ON payments (payment_status);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: payer-scoped read
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select_payer ON payments
  FOR SELECT
  USING (
    payer_app_user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

-- Insert/update are server-only (service role)

-- ---------------------------------------------------------------------------
-- earnings — tutor-facing earning record linked to lesson fulfillment
-- ---------------------------------------------------------------------------
CREATE TABLE earnings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id           uuid NOT NULL REFERENCES lessons(id),
  tutor_profile_id    uuid NOT NULL REFERENCES tutor_profiles(id),
  earning_status      text NOT NULL DEFAULT 'pending',
  gross_amount        numeric NOT NULL,
  platform_fee_amount numeric NOT NULL,
  net_amount          numeric NOT NULL,
  available_at        timestamptz,
  paid_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_earnings_lesson ON earnings (lesson_id);
CREATE INDEX idx_earnings_tutor ON earnings (tutor_profile_id);
CREATE INDEX idx_earnings_status ON earnings (earning_status);

CREATE TRIGGER earnings_updated_at
  BEFORE UPDATE ON earnings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: tutor-owner read
ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY earnings_select_tutor ON earnings
  FOR SELECT
  USING (
    tutor_profile_id IN (
      SELECT id FROM tutor_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Insert/update are server-only (service role)
