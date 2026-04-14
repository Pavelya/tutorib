-- P1-DATA-001: Identity, account, and profile schema baseline
-- Category A: additive schema change
-- Tables: app_users, user_roles, student_profiles
-- RLS: enabled with initial policies

-- ---------------------------------------------------------------------------
-- Helper: auto-update updated_at on row modification
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- app_users
-- ---------------------------------------------------------------------------
CREATE TABLE app_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  uuid NOT NULL UNIQUE,
  email         text NOT NULL,
  full_name     text,
  avatar_url    text,
  timezone      text,
  preferred_language_code text,
  onboarding_state  text NOT NULL DEFAULT 'pending',
  account_status    text NOT NULL DEFAULT 'active',
  primary_role_context text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: Type B — self-row access
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_users_select_own ON app_users
  FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY app_users_update_own ON app_users
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Insert is server-only (service role) during auth resolution — no anon/authenticated insert policy

-- ---------------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------------
CREATE TABLE user_roles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id   uuid NOT NULL REFERENCES app_users(id),
  role          text NOT NULL,
  role_status   text NOT NULL DEFAULT 'active',
  granted_at    timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_roles_app_user_id ON user_roles(app_user_id);

CREATE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: Type B — self-inspect own roles, no self-service writes
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_roles_select_own ON user_roles
  FOR SELECT
  USING (
    app_user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

-- Insert/update/delete are server-only (service role)

-- ---------------------------------------------------------------------------
-- student_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE student_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id   uuid NOT NULL UNIQUE REFERENCES app_users(id),
  display_name  text,
  current_stage_summary text,
  notes_visibility_preference text DEFAULT 'tutor_only',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: Type B — self-row access
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_profiles_select_own ON student_profiles
  FOR SELECT
  USING (
    app_user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY student_profiles_update_own ON student_profiles
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

-- Insert is server-only (service role) during role selection flow
