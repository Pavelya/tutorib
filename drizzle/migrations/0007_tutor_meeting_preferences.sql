-- P1-TUTOR-003: Tutor default meeting preference
-- Category A: additive schema change
-- Tables: tutor_meeting_preferences
-- RLS: Type B owner-scoped read/write

-- ---------------------------------------------------------------------------
-- tutor_meeting_preferences — tutor-owned default meeting provider and link.
-- One row per tutor; serves as the source for lesson meeting-access snapshots.
-- ---------------------------------------------------------------------------
CREATE TABLE tutor_meeting_preferences (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_profile_id    uuid NOT NULL UNIQUE REFERENCES tutor_profiles(id),
  provider_key        text NOT NULL,
  default_meeting_url text,
  display_label       text,
  is_active           boolean NOT NULL DEFAULT true,
  last_validated_at   timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER tutor_meeting_preferences_updated_at
  BEFORE UPDATE ON tutor_meeting_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: owner read/write
ALTER TABLE tutor_meeting_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY tutor_meeting_preferences_select_own ON tutor_meeting_preferences
  FOR SELECT
  USING (
    tutor_profile_id IN (
      SELECT id FROM tutor_profiles WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY tutor_meeting_preferences_update_own ON tutor_meeting_preferences
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
