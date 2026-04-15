-- P1-DATA-002: Tutor, reference data, and availability schema baseline
-- Category A: additive schema change
-- Tables: subjects, subject_focus_areas, languages, countries,
--         meeting_providers, video_media_providers, tutor_profiles,
--         tutor_subject_capabilities, tutor_language_capabilities,
--         tutor_credentials, schedule_policies, availability_rules,
--         availability_overrides
-- RLS: mixed Type A/B for tutor profiles and capabilities,
--       Type B owner-scoped for scheduling, Type C for credentials

-- =========================================================================
-- REFERENCE DATA
-- =========================================================================

-- ---------------------------------------------------------------------------
-- subjects — canonical IB subject list
-- ---------------------------------------------------------------------------
CREATE TABLE subjects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  category      text,
  is_active     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER subjects_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: public-safe read for active subjects
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY subjects_select_all ON subjects
  FOR SELECT
  USING (true);

-- Insert/update/delete are server-only (admin/migration)

-- ---------------------------------------------------------------------------
-- subject_focus_areas — IB-specific focus areas (IA, EE, TOK, IO, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE subject_focus_areas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id    uuid NOT NULL REFERENCES subjects(id),
  name          text NOT NULL,
  slug          text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subject_focus_areas_subject ON subject_focus_areas (subject_id);

CREATE TRIGGER subject_focus_areas_updated_at
  BEFORE UPDATE ON subject_focus_areas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: public-safe read
ALTER TABLE subject_focus_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY subject_focus_areas_select_all ON subject_focus_areas
  FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- languages — canonical language options
-- ---------------------------------------------------------------------------
CREATE TABLE languages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  name          text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER languages_updated_at
  BEFORE UPDATE ON languages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: public-safe read
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY languages_select_all ON languages
  FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- countries — canonical country list
-- ---------------------------------------------------------------------------
CREATE TABLE countries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  name          text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER countries_updated_at
  BEFORE UPDATE ON countries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: public-safe read
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY countries_select_all ON countries
  FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- meeting_providers — supported external meeting providers
-- ---------------------------------------------------------------------------
CREATE TABLE meeting_providers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text NOT NULL UNIQUE,
  name          text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER meeting_providers_updated_at
  BEFORE UPDATE ON meeting_providers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: public-safe read
ALTER TABLE meeting_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY meeting_providers_select_all ON meeting_providers
  FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- video_media_providers — supported external video providers for intro videos
-- ---------------------------------------------------------------------------
CREATE TABLE video_media_providers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text NOT NULL UNIQUE,
  name          text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER video_media_providers_updated_at
  BEFORE UPDATE ON video_media_providers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: public-safe read
ALTER TABLE video_media_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY video_media_providers_select_all ON video_media_providers
  FOR SELECT
  USING (true);

-- =========================================================================
-- TUTOR PROFILES AND CAPABILITIES
-- =========================================================================

-- ---------------------------------------------------------------------------
-- tutor_profiles — canonical tutor object for public display and owner editing
-- ---------------------------------------------------------------------------
CREATE TABLE tutor_profiles (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id               uuid NOT NULL UNIQUE REFERENCES app_users(id),
  display_name              text,
  public_slug               text UNIQUE,
  headline                  text,
  bio                       text,
  teaching_style_summary    text,
  best_for_summary          text,
  pricing_summary           text,
  profile_visibility_status text NOT NULL DEFAULT 'draft',
  application_status        text NOT NULL DEFAULT 'not_submitted',
  public_listing_status     text NOT NULL DEFAULT 'unlisted',
  payout_readiness_status   text NOT NULL DEFAULT 'not_started',
  intro_video_provider      text,
  intro_video_external_id   text,
  intro_video_url           text,
  country_code              text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutor_profiles_public_slug ON tutor_profiles (public_slug);
CREATE INDEX idx_tutor_profiles_listing_status ON tutor_profiles (public_listing_status);

CREATE TRIGGER tutor_profiles_updated_at
  BEFORE UPDATE ON tutor_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: mixed — owner can read/update own row, public reads go through projections
ALTER TABLE tutor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY tutor_profiles_select_own ON tutor_profiles
  FOR SELECT
  USING (
    app_user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY tutor_profiles_update_own ON tutor_profiles
  FOR UPDATE
  USING (
    app_user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    app_user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

-- Insert/delete are server-only (service role)

-- ---------------------------------------------------------------------------
-- tutor_subject_capabilities — which subjects and focus areas a tutor can teach
-- ---------------------------------------------------------------------------
CREATE TABLE tutor_subject_capabilities (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_profile_id      uuid NOT NULL REFERENCES tutor_profiles(id),
  subject_id            uuid NOT NULL REFERENCES subjects(id),
  subject_focus_area_id uuid REFERENCES subject_focus_areas(id),
  experience_summary    text,
  display_priority      integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutor_subject_caps_tutor ON tutor_subject_capabilities (tutor_profile_id);
CREATE INDEX idx_tutor_subject_caps_subject ON tutor_subject_capabilities (subject_id);

CREATE TRIGGER tutor_subject_capabilities_updated_at
  BEFORE UPDATE ON tutor_subject_capabilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: owner-scoped management
ALTER TABLE tutor_subject_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY tutor_subject_caps_select_own ON tutor_subject_capabilities
  FOR SELECT
  USING (
    tutor_profile_id IN (
      SELECT id FROM tutor_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Insert/update/delete are server-only (service role)

-- ---------------------------------------------------------------------------
-- tutor_language_capabilities — structured tutoring language support per tutor
-- ---------------------------------------------------------------------------
CREATE TABLE tutor_language_capabilities (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_profile_id uuid NOT NULL REFERENCES tutor_profiles(id),
  language_code    text NOT NULL REFERENCES languages(code),
  display_priority integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutor_lang_caps_tutor ON tutor_language_capabilities (tutor_profile_id);

CREATE TRIGGER tutor_language_capabilities_updated_at
  BEFORE UPDATE ON tutor_language_capabilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: owner-scoped management
ALTER TABLE tutor_language_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY tutor_lang_caps_select_own ON tutor_language_capabilities
  FOR SELECT
  USING (
    tutor_profile_id IN (
      SELECT id FROM tutor_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Insert/update/delete are server-only (service role)

-- ---------------------------------------------------------------------------
-- tutor_credentials — private evidence records for verification and trust review
-- ---------------------------------------------------------------------------
CREATE TABLE tutor_credentials (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_profile_id          uuid NOT NULL REFERENCES tutor_profiles(id),
  credential_type           text NOT NULL,
  title                     text NOT NULL,
  issuing_body              text,
  storage_object_path       text,
  review_status             text NOT NULL DEFAULT 'pending',
  reviewed_at               timestamptz,
  public_display_preference boolean NOT NULL DEFAULT false,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutor_credentials_tutor ON tutor_credentials (tutor_profile_id);

CREATE TRIGGER tutor_credentials_updated_at
  BEFORE UPDATE ON tutor_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: Type C — owner limited read, never public
ALTER TABLE tutor_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY tutor_credentials_select_own ON tutor_credentials
  FOR SELECT
  USING (
    tutor_profile_id IN (
      SELECT id FROM tutor_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Insert/update/delete are server-only (service role)

-- =========================================================================
-- SCHEDULING AND AVAILABILITY
-- =========================================================================

-- ---------------------------------------------------------------------------
-- schedule_policies — tutor-level booking rules that shape slot generation
-- ---------------------------------------------------------------------------
CREATE TABLE schedule_policies (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_profile_id         uuid NOT NULL UNIQUE REFERENCES tutor_profiles(id),
  timezone                 text NOT NULL,
  minimum_notice_minutes   integer NOT NULL DEFAULT 480,
  buffer_before_minutes    integer NOT NULL DEFAULT 0,
  buffer_after_minutes     integer NOT NULL DEFAULT 0,
  daily_capacity           integer,
  weekly_capacity          integer,
  is_accepting_new_students boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER schedule_policies_updated_at
  BEFORE UPDATE ON schedule_policies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: owner read/write
ALTER TABLE schedule_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY schedule_policies_select_own ON schedule_policies
  FOR SELECT
  USING (
    tutor_profile_id IN (
      SELECT id FROM tutor_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY schedule_policies_update_own ON schedule_policies
  FOR UPDATE
  USING (
    tutor_profile_id IN (
      SELECT id FROM tutor_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    tutor_profile_id IN (
      SELECT id FROM tutor_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Insert/delete are server-only (service role)

-- ---------------------------------------------------------------------------
-- availability_rules — recurring weekly availability rules
-- ---------------------------------------------------------------------------
CREATE TABLE availability_rules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_profile_id  uuid NOT NULL REFERENCES tutor_profiles(id),
  day_of_week       integer NOT NULL,
  start_local_time  time NOT NULL,
  end_local_time    time NOT NULL,
  visibility_status text NOT NULL DEFAULT 'active',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_availability_rules_tutor ON availability_rules (tutor_profile_id);

CREATE TRIGGER availability_rules_updated_at
  BEFORE UPDATE ON availability_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: owner read/write
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY availability_rules_select_own ON availability_rules
  FOR SELECT
  USING (
    tutor_profile_id IN (
      SELECT id FROM tutor_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY availability_rules_update_own ON availability_rules
  FOR UPDATE
  USING (
    tutor_profile_id IN (
      SELECT id FROM tutor_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    tutor_profile_id IN (
      SELECT id FROM tutor_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Insert/delete are server-only (service role)

-- ---------------------------------------------------------------------------
-- availability_overrides — date-specific changes to the recurring schedule
-- ---------------------------------------------------------------------------
CREATE TABLE availability_overrides (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_profile_id uuid NOT NULL REFERENCES tutor_profiles(id),
  override_date    date NOT NULL,
  override_type    text NOT NULL,
  start_local_time time,
  end_local_time   time,
  reason           text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_availability_overrides_tutor_date
  ON availability_overrides (tutor_profile_id, override_date);

CREATE TRIGGER availability_overrides_updated_at
  BEFORE UPDATE ON availability_overrides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: owner read/write
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY availability_overrides_select_own ON availability_overrides
  FOR SELECT
  USING (
    tutor_profile_id IN (
      SELECT id FROM tutor_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY availability_overrides_update_own ON availability_overrides
  FOR UPDATE
  USING (
    tutor_profile_id IN (
      SELECT id FROM tutor_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    tutor_profile_id IN (
      SELECT id FROM tutor_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Insert/delete are server-only (service role)
