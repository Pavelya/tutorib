-- P1-JOBS-001: Background job and webhook event infrastructure
-- Category A: additive schema change
-- Tables: job_runs, webhook_events
-- RLS: server-only (no client-side policies)

-- ---------------------------------------------------------------------------
-- job_runs — durable background-job tracking with retry and dead-letter support
-- ---------------------------------------------------------------------------
CREATE TABLE job_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type          text NOT NULL,
  job_status        text NOT NULL DEFAULT 'pending',
  idempotency_key   text,
  trigger_object_type text,
  trigger_object_id uuid,
  payload           jsonb,
  attempt_number    integer NOT NULL DEFAULT 0,
  max_attempts      integer NOT NULL DEFAULT 5,
  next_retry_at     timestamptz,
  started_at        timestamptz,
  finished_at       timestamptz,
  failure_code      text,
  failure_message   text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Partial unique index: deduplicate by idempotency_key when present
CREATE UNIQUE INDEX uq_job_runs_idempotency_key
  ON job_runs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Composite index for cron runner: find retryable/pending jobs efficiently
CREATE INDEX idx_job_runs_status_retry
  ON job_runs (job_status, next_retry_at);

CREATE INDEX idx_job_runs_job_type
  ON job_runs (job_type);

CREATE TRIGGER job_runs_updated_at
  BEFORE UPDATE ON job_runs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: server-only — no client-side access needed
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- webhook_events — provider webhook receipt, verification, and idempotency
-- ---------------------------------------------------------------------------
CREATE TABLE webhook_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider            text NOT NULL,
  provider_event_id   text NOT NULL,
  event_type          text NOT NULL,
  verification_status text NOT NULL,
  processing_status   text NOT NULL DEFAULT 'pending',
  payload             jsonb,
  failure_message     text,
  received_at         timestamptz NOT NULL DEFAULT now(),
  processed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one record per provider + provider_event_id (dedup boundary)
CREATE UNIQUE INDEX uq_webhook_events_provider_event
  ON webhook_events (provider, provider_event_id);

CREATE INDEX idx_webhook_events_processing_status
  ON webhook_events (processing_status);
