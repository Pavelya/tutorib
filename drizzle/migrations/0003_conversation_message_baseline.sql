-- P1-DATA-004: Conversation and message schema baseline
-- Category A: additive schema change
-- Tables: conversations, conversation_participants, messages, message_reads,
--         user_blocks, abuse_reports
-- RLS: participant-scoped for conversations/messages, self-row for blocks/reports

-- =========================================================================
-- TABLE DEFINITIONS (all tables first, RLS policies after)
-- =========================================================================

-- ---------------------------------------------------------------------------
-- conversations — one persistent thread per student-tutor relationship
-- ---------------------------------------------------------------------------
CREATE TABLE conversations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id      uuid NOT NULL REFERENCES student_profiles(id),
  tutor_profile_id        uuid NOT NULL REFERENCES tutor_profiles(id),
  conversation_status     text NOT NULL DEFAULT 'active',
  origin_learning_need_id uuid,
  last_message_at         timestamptz,
  last_message_id         uuid,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_conversations_student_tutor
  ON conversations (student_profile_id, tutor_profile_id);

CREATE INDEX idx_conversations_student ON conversations (student_profile_id);
CREATE INDEX idx_conversations_tutor ON conversations (tutor_profile_id);

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- conversation_participants — participant state and thread-specific preferences
-- ---------------------------------------------------------------------------
CREATE TABLE conversation_participants (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid NOT NULL REFERENCES conversations(id),
  app_user_id       uuid NOT NULL REFERENCES app_users(id),
  participant_role  text NOT NULL,
  is_muted          boolean NOT NULL DEFAULT false,
  is_archived       boolean NOT NULL DEFAULT false,
  joined_at         timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_conversation_participants_conv_user
  ON conversation_participants (conversation_id, app_user_id);

CREATE INDEX idx_conversation_participants_user ON conversation_participants (app_user_id);

CREATE TRIGGER conversation_participants_updated_at
  BEFORE UPDATE ON conversation_participants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- messages — canonical message store
-- ---------------------------------------------------------------------------
CREATE TABLE messages (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id       uuid NOT NULL REFERENCES conversations(id),
  sender_app_user_id    uuid NOT NULL REFERENCES app_users(id),
  reply_to_message_id   uuid,
  body                  text NOT NULL,
  message_status        text NOT NULL DEFAULT 'sent',
  edited_at             timestamptz,
  removed_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id);
CREATE INDEX idx_messages_sender ON messages (sender_app_user_id);
CREATE INDEX idx_messages_conversation_created ON messages (conversation_id, created_at);

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- message_reads — unread/read state tracking per participant per message
-- ---------------------------------------------------------------------------
CREATE TABLE message_reads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    uuid NOT NULL REFERENCES messages(id),
  app_user_id   uuid NOT NULL REFERENCES app_users(id),
  read_at       timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_message_reads_message_user
  ON message_reads (message_id, app_user_id);

CREATE INDEX idx_message_reads_user ON message_reads (app_user_id);

-- ---------------------------------------------------------------------------
-- user_blocks — blocking rule between users
-- ---------------------------------------------------------------------------
CREATE TABLE user_blocks (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_app_user_id   uuid NOT NULL REFERENCES app_users(id),
  blocked_app_user_id   uuid NOT NULL REFERENCES app_users(id),
  block_status          text NOT NULL DEFAULT 'active',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_user_blocks_pair
  ON user_blocks (blocker_app_user_id, blocked_app_user_id);

CREATE INDEX idx_user_blocks_blocked ON user_blocks (blocked_app_user_id);

CREATE TRIGGER user_blocks_updated_at
  BEFORE UPDATE ON user_blocks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- abuse_reports — user-submitted report for moderation and trust review
-- ---------------------------------------------------------------------------
CREATE TABLE abuse_reports (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_app_user_id    uuid NOT NULL REFERENCES app_users(id),
  reported_app_user_id    uuid NOT NULL REFERENCES app_users(id),
  conversation_id         uuid REFERENCES conversations(id),
  message_id              uuid REFERENCES messages(id),
  report_type             text NOT NULL,
  report_status           text NOT NULL DEFAULT 'open',
  summary                 text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_abuse_reports_reported ON abuse_reports (reported_app_user_id);
CREATE INDEX idx_abuse_reports_status ON abuse_reports (report_status);

CREATE TRIGGER abuse_reports_updated_at
  BEFORE UPDATE ON abuse_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- RLS POLICIES (all tables exist now, safe to cross-reference)
-- =========================================================================

-- conversations: participant-scoped
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_select_participant ON conversations
  FOR SELECT
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- conversation_participants: self-row access
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversation_participants_select_own ON conversation_participants
  FOR SELECT
  USING (
    app_user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY conversation_participants_update_own ON conversation_participants
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

-- messages: participant-scoped
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select_participant ON messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE app_user_id IN (
        SELECT id FROM app_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- message_reads: self-row access
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY message_reads_select_own ON message_reads
  FOR SELECT
  USING (
    app_user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

-- user_blocks: self-row access
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_blocks_select_own ON user_blocks
  FOR SELECT
  USING (
    blocker_app_user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

-- abuse_reports: self-row access
ALTER TABLE abuse_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY abuse_reports_select_own ON abuse_reports
  FOR SELECT
  USING (
    reporter_app_user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = auth.uid()
    )
  );
