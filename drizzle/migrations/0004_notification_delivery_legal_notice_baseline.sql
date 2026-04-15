-- P1-DATA-005: Notification, delivery, and legal-notice schema baseline
-- Category A: additive schema change
-- Tables: notifications, notification_deliveries, policy_notice_versions,
--         policy_notice_receipts
-- RLS: owner-scoped for notifications and receipts, server-only for deliveries,
--      public-safe read for policy_notice_versions

-- ---------------------------------------------------------------------------
-- notifications — in-app user notification object
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id         uuid NOT NULL REFERENCES app_users(id),
  notification_type   text NOT NULL,
  notification_status text NOT NULL DEFAULT 'unread',
  object_type         text,
  object_id           uuid,
  title               text NOT NULL,
  body_summary        text,
  read_at             timestamptz,
  dismissed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_status
  ON notifications (app_user_id, notification_status);

CREATE INDEX idx_notifications_user_created
  ON notifications (app_user_id, created_at);

CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: owner-scoped — users can read their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own ON notifications
  FOR SELECT
  USING (
    app_user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY notifications_update_own ON notifications
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
-- notification_deliveries — delivery-attempt tracking for outbound notifications
-- ---------------------------------------------------------------------------
CREATE TABLE notification_deliveries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id     uuid NOT NULL REFERENCES notifications(id),
  channel             text NOT NULL,
  delivery_status     text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  attempted_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_deliveries_notification
  ON notification_deliveries (notification_id);

CREATE INDEX idx_notification_deliveries_status
  ON notification_deliveries (delivery_status);

CREATE TRIGGER notification_deliveries_updated_at
  BEFORE UPDATE ON notification_deliveries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: server-only — no client-side access needed
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- policy_notice_versions — versioned legal-notice records (terms, privacy, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE policy_notice_versions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_type               text NOT NULL,
  version_label             text NOT NULL,
  published_at              timestamptz,
  effective_at              timestamptz,
  requires_acknowledgement  boolean NOT NULL DEFAULT false,
  title                     text NOT NULL,
  summary                   text,
  document_url              text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- One version label per notice type
CREATE UNIQUE INDEX uq_policy_notice_versions_type_version
  ON policy_notice_versions (notice_type, version_label);

CREATE INDEX idx_policy_notice_versions_type
  ON policy_notice_versions (notice_type);

CREATE TRIGGER policy_notice_versions_updated_at
  BEFORE UPDATE ON policy_notice_versions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: public-safe read — authenticated users can read published policy notices
ALTER TABLE policy_notice_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_notice_versions_select_authenticated ON policy_notice_versions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert/update/delete are server-only (service role)

-- ---------------------------------------------------------------------------
-- policy_notice_receipts — per-user receipt and acknowledgement for legal notices
-- ---------------------------------------------------------------------------
CREATE TABLE policy_notice_receipts (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_notice_version_id  uuid NOT NULL REFERENCES policy_notice_versions(id),
  app_user_id               uuid NOT NULL REFERENCES app_users(id),
  first_shown_at            timestamptz,
  viewed_at                 timestamptz,
  acknowledged_at           timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- One receipt per notice version per user
CREATE UNIQUE INDEX uq_policy_notice_receipts_version_user
  ON policy_notice_receipts (policy_notice_version_id, app_user_id);

CREATE INDEX idx_policy_notice_receipts_user
  ON policy_notice_receipts (app_user_id);

CREATE TRIGGER policy_notice_receipts_updated_at
  BEFORE UPDATE ON policy_notice_receipts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: owner-scoped — users can read and update their own receipts
ALTER TABLE policy_notice_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_notice_receipts_select_own ON policy_notice_receipts
  FOR SELECT
  USING (
    app_user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY policy_notice_receipts_update_own ON policy_notice_receipts
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
