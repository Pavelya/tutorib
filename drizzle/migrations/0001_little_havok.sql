CREATE TABLE "abuse_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_app_user_id" uuid NOT NULL,
	"reported_app_user_id" uuid NOT NULL,
	"conversation_id" uuid,
	"message_id" uuid,
	"report_type" text NOT NULL,
	"report_status" text DEFAULT 'open' NOT NULL,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"app_user_id" uuid NOT NULL,
	"participant_role" text NOT NULL,
	"is_muted" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_profile_id" uuid NOT NULL,
	"tutor_profile_id" uuid NOT NULL,
	"conversation_status" text DEFAULT 'active' NOT NULL,
	"origin_learning_need_id" uuid,
	"last_message_at" timestamp with time zone,
	"last_message_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"tutor_profile_id" uuid NOT NULL,
	"earning_status" text DEFAULT 'pending' NOT NULL,
	"gross_amount" numeric NOT NULL,
	"platform_fee_amount" numeric NOT NULL,
	"net_amount" numeric NOT NULL,
	"available_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_needs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_profile_id" uuid NOT NULL,
	"need_status" text DEFAULT 'active' NOT NULL,
	"need_type" text NOT NULL,
	"subject_id" uuid,
	"subject_focus_area_id" uuid,
	"urgency_level" text,
	"support_style" text,
	"language_code" text,
	"timezone" text,
	"session_frequency_intent" text,
	"free_text_note" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_issue_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"case_status" text DEFAULT 'open' NOT NULL,
	"student_claim_type" text,
	"student_reported_at" timestamp with time zone,
	"tutor_claim_type" text,
	"tutor_reported_at" timestamp with time zone,
	"resolution_outcome" text,
	"resolution_note" text,
	"resolved_by_app_user_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_meeting_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"meeting_url" text,
	"normalized_host" text,
	"access_status" text DEFAULT 'active' NOT NULL,
	"updated_by_app_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"report_status" text DEFAULT 'draft' NOT NULL,
	"goal_summary" text,
	"coverage_summary" text,
	"student_confidence_signal" text,
	"next_steps_summary" text,
	"student_visible_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"changed_by_app_user_id" uuid,
	"change_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_profile_id" uuid NOT NULL,
	"tutor_profile_id" uuid NOT NULL,
	"learning_need_id" uuid,
	"match_candidate_id" uuid,
	"lesson_status" text DEFAULT 'requested' NOT NULL,
	"scheduled_start_at" timestamp with time zone NOT NULL,
	"scheduled_end_at" timestamp with time zone NOT NULL,
	"request_expires_at" timestamp with time zone,
	"lesson_timezone" text NOT NULL,
	"meeting_method" text,
	"price_amount" numeric,
	"currency_code" text DEFAULT 'USD',
	"is_trial" boolean DEFAULT false NOT NULL,
	"subject_snapshot" text,
	"focus_snapshot" text,
	"student_note_snapshot" text,
	"accepted_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by_app_user_id" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_run_id" uuid NOT NULL,
	"tutor_profile_id" uuid NOT NULL,
	"candidate_state" text DEFAULT 'candidate' NOT NULL,
	"rank_position" integer NOT NULL,
	"match_score" numeric,
	"confidence_label" text,
	"fit_summary" text,
	"best_for_summary" text,
	"availability_signal" text,
	"trust_signal_snapshot" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_need_id" uuid NOT NULL,
	"ranking_version" text NOT NULL,
	"need_signature" text,
	"matching_projection_version" text,
	"run_status" text DEFAULT 'pending' NOT NULL,
	"candidate_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"app_user_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_app_user_id" uuid NOT NULL,
	"reply_to_message_id" uuid,
	"body" text NOT NULL,
	"message_status" text DEFAULT 'sent' NOT NULL,
	"edited_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"payer_app_user_id" uuid NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"amount" numeric NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"authorized_at" timestamp with time zone,
	"authorization_expires_at" timestamp with time zone,
	"captured_at" timestamp with time zone,
	"capture_cancelled_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_app_user_id" uuid NOT NULL,
	"blocked_app_user_id" uuid NOT NULL,
	"block_status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_reporter_app_user_id_app_users_id_fk" FOREIGN KEY ("reporter_app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_reported_app_user_id_app_users_id_fk" FOREIGN KEY ("reported_app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_app_user_id_app_users_id_fk" FOREIGN KEY ("app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tutor_profile_id_tutor_profiles_id_fk" FOREIGN KEY ("tutor_profile_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_tutor_profile_id_tutor_profiles_id_fk" FOREIGN KEY ("tutor_profile_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_needs" ADD CONSTRAINT "learning_needs_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_needs" ADD CONSTRAINT "learning_needs_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_needs" ADD CONSTRAINT "learning_needs_subject_focus_area_id_subject_focus_areas_id_fk" FOREIGN KEY ("subject_focus_area_id") REFERENCES "public"."subject_focus_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_needs" ADD CONSTRAINT "learning_needs_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_issue_cases" ADD CONSTRAINT "lesson_issue_cases_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_issue_cases" ADD CONSTRAINT "lesson_issue_cases_resolved_by_app_user_id_app_users_id_fk" FOREIGN KEY ("resolved_by_app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_meeting_access" ADD CONSTRAINT "lesson_meeting_access_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_meeting_access" ADD CONSTRAINT "lesson_meeting_access_updated_by_app_user_id_app_users_id_fk" FOREIGN KEY ("updated_by_app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_reports" ADD CONSTRAINT "lesson_reports_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_status_history" ADD CONSTRAINT "lesson_status_history_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_status_history" ADD CONSTRAINT "lesson_status_history_changed_by_app_user_id_app_users_id_fk" FOREIGN KEY ("changed_by_app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_tutor_profile_id_tutor_profiles_id_fk" FOREIGN KEY ("tutor_profile_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_learning_need_id_learning_needs_id_fk" FOREIGN KEY ("learning_need_id") REFERENCES "public"."learning_needs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_match_candidate_id_match_candidates_id_fk" FOREIGN KEY ("match_candidate_id") REFERENCES "public"."match_candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_cancelled_by_app_user_id_app_users_id_fk" FOREIGN KEY ("cancelled_by_app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_match_run_id_match_runs_id_fk" FOREIGN KEY ("match_run_id") REFERENCES "public"."match_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_tutor_profile_id_tutor_profiles_id_fk" FOREIGN KEY ("tutor_profile_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_runs" ADD CONSTRAINT "match_runs_learning_need_id_learning_needs_id_fk" FOREIGN KEY ("learning_need_id") REFERENCES "public"."learning_needs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_app_user_id_app_users_id_fk" FOREIGN KEY ("app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_app_user_id_app_users_id_fk" FOREIGN KEY ("sender_app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_app_user_id_app_users_id_fk" FOREIGN KEY ("payer_app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_app_user_id_app_users_id_fk" FOREIGN KEY ("blocker_app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_app_user_id_app_users_id_fk" FOREIGN KEY ("blocked_app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_abuse_reports_reported" ON "abuse_reports" USING btree ("reported_app_user_id");--> statement-breakpoint
CREATE INDEX "idx_abuse_reports_status" ON "abuse_reports" USING btree ("report_status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_conversation_participants_conv_user" ON "conversation_participants" USING btree ("conversation_id","app_user_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_participants_user" ON "conversation_participants" USING btree ("app_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_conversations_student_tutor" ON "conversations" USING btree ("student_profile_id","tutor_profile_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_student" ON "conversations" USING btree ("student_profile_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_tutor" ON "conversations" USING btree ("tutor_profile_id");--> statement-breakpoint
CREATE INDEX "idx_earnings_lesson" ON "earnings" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "idx_earnings_tutor" ON "earnings" USING btree ("tutor_profile_id");--> statement-breakpoint
CREATE INDEX "idx_earnings_status" ON "earnings" USING btree ("earning_status");--> statement-breakpoint
CREATE INDEX "idx_learning_needs_student" ON "learning_needs" USING btree ("student_profile_id");--> statement-breakpoint
CREATE INDEX "idx_learning_needs_status" ON "learning_needs" USING btree ("need_status");--> statement-breakpoint
CREATE INDEX "idx_learning_needs_subject" ON "learning_needs" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "idx_lesson_issue_cases_lesson" ON "lesson_issue_cases" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "idx_lesson_issue_cases_status" ON "lesson_issue_cases" USING btree ("case_status");--> statement-breakpoint
CREATE INDEX "idx_lesson_meeting_access_lesson" ON "lesson_meeting_access" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "idx_lesson_reports_lesson" ON "lesson_reports" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "idx_lesson_status_history_lesson" ON "lesson_status_history" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "idx_lessons_student" ON "lessons" USING btree ("student_profile_id");--> statement-breakpoint
CREATE INDEX "idx_lessons_tutor" ON "lessons" USING btree ("tutor_profile_id");--> statement-breakpoint
CREATE INDEX "idx_lessons_status" ON "lessons" USING btree ("lesson_status");--> statement-breakpoint
CREATE INDEX "idx_lessons_scheduled_start" ON "lessons" USING btree ("scheduled_start_at");--> statement-breakpoint
CREATE INDEX "idx_lessons_tutor_status" ON "lessons" USING btree ("tutor_profile_id","lesson_status");--> statement-breakpoint
CREATE INDEX "idx_match_candidates_run" ON "match_candidates" USING btree ("match_run_id");--> statement-breakpoint
CREATE INDEX "idx_match_candidates_tutor" ON "match_candidates" USING btree ("tutor_profile_id");--> statement-breakpoint
CREATE INDEX "idx_match_candidates_state" ON "match_candidates" USING btree ("candidate_state");--> statement-breakpoint
CREATE INDEX "idx_match_runs_learning_need" ON "match_runs" USING btree ("learning_need_id");--> statement-breakpoint
CREATE INDEX "idx_match_runs_status" ON "match_runs" USING btree ("run_status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_message_reads_message_user" ON "message_reads" USING btree ("message_id","app_user_id");--> statement-breakpoint
CREATE INDEX "idx_message_reads_user" ON "message_reads" USING btree ("app_user_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_messages_sender" ON "messages" USING btree ("sender_app_user_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation_created" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_payments_lesson" ON "payments" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "idx_payments_payer" ON "payments" USING btree ("payer_app_user_id");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("payment_status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_blocks_pair" ON "user_blocks" USING btree ("blocker_app_user_id","blocked_app_user_id");--> statement-breakpoint
CREATE INDEX "idx_user_blocks_blocked" ON "user_blocks" USING btree ("blocked_app_user_id");