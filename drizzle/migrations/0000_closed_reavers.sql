CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"timezone" text,
	"preferred_language_code" text,
	"onboarding_state" text DEFAULT 'pending' NOT NULL,
	"account_status" text DEFAULT 'active' NOT NULL,
	"primary_role_context" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
CREATE TABLE "availability_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_profile_id" uuid NOT NULL,
	"override_date" date NOT NULL,
	"override_type" text NOT NULL,
	"start_local_time" time,
	"end_local_time" time,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_profile_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_local_time" time NOT NULL,
	"end_local_time" time NOT NULL,
	"visibility_status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "countries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" text NOT NULL,
	"job_status" text DEFAULT 'pending' NOT NULL,
	"idempotency_key" text,
	"trigger_object_type" text,
	"trigger_object_id" uuid,
	"payload" jsonb,
	"attempt_number" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"next_retry_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"failure_code" text,
	"failure_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "languages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "meeting_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meeting_providers_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "schedule_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_profile_id" uuid NOT NULL,
	"timezone" text NOT NULL,
	"minimum_notice_minutes" integer DEFAULT 480 NOT NULL,
	"buffer_before_minutes" integer DEFAULT 0 NOT NULL,
	"buffer_after_minutes" integer DEFAULT 0 NOT NULL,
	"daily_capacity" integer,
	"weekly_capacity" integer,
	"is_accepting_new_students" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_policies_tutor_profile_id_unique" UNIQUE("tutor_profile_id")
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_user_id" uuid NOT NULL,
	"display_name" text,
	"current_stage_summary" text,
	"notes_visibility_preference" text DEFAULT 'tutor_only',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_profiles_app_user_id_unique" UNIQUE("app_user_id")
);
--> statement-breakpoint
CREATE TABLE "subject_focus_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tutor_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_profile_id" uuid NOT NULL,
	"credential_type" text NOT NULL,
	"title" text NOT NULL,
	"issuing_body" text,
	"storage_object_path" text,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"public_display_preference" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_language_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_profile_id" uuid NOT NULL,
	"language_code" text NOT NULL,
	"display_priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_user_id" uuid NOT NULL,
	"display_name" text,
	"public_slug" text,
	"headline" text,
	"bio" text,
	"teaching_style_summary" text,
	"best_for_summary" text,
	"pricing_summary" text,
	"profile_visibility_status" text DEFAULT 'draft' NOT NULL,
	"application_status" text DEFAULT 'not_submitted' NOT NULL,
	"public_listing_status" text DEFAULT 'unlisted' NOT NULL,
	"payout_readiness_status" text DEFAULT 'not_started' NOT NULL,
	"intro_video_provider" text,
	"intro_video_external_id" text,
	"intro_video_url" text,
	"country_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tutor_profiles_app_user_id_unique" UNIQUE("app_user_id"),
	CONSTRAINT "tutor_profiles_public_slug_unique" UNIQUE("public_slug")
);
--> statement-breakpoint
CREATE TABLE "tutor_subject_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_profile_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"subject_focus_area_id" uuid,
	"experience_summary" text,
	"display_priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"role_status" text DEFAULT 'active' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_media_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_media_providers_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"verification_status" text NOT NULL,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"payload" jsonb,
	"failure_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "availability_overrides" ADD CONSTRAINT "availability_overrides_tutor_profile_id_tutor_profiles_id_fk" FOREIGN KEY ("tutor_profile_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_tutor_profile_id_tutor_profiles_id_fk" FOREIGN KEY ("tutor_profile_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_policies" ADD CONSTRAINT "schedule_policies_tutor_profile_id_tutor_profiles_id_fk" FOREIGN KEY ("tutor_profile_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_app_user_id_app_users_id_fk" FOREIGN KEY ("app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_focus_areas" ADD CONSTRAINT "subject_focus_areas_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_credentials" ADD CONSTRAINT "tutor_credentials_tutor_profile_id_tutor_profiles_id_fk" FOREIGN KEY ("tutor_profile_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_language_capabilities" ADD CONSTRAINT "tutor_language_capabilities_tutor_profile_id_tutor_profiles_id_fk" FOREIGN KEY ("tutor_profile_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_language_capabilities" ADD CONSTRAINT "tutor_language_capabilities_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_profiles" ADD CONSTRAINT "tutor_profiles_app_user_id_app_users_id_fk" FOREIGN KEY ("app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_subject_capabilities" ADD CONSTRAINT "tutor_subject_capabilities_tutor_profile_id_tutor_profiles_id_fk" FOREIGN KEY ("tutor_profile_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_subject_capabilities" ADD CONSTRAINT "tutor_subject_capabilities_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_subject_capabilities" ADD CONSTRAINT "tutor_subject_capabilities_subject_focus_area_id_subject_focus_areas_id_fk" FOREIGN KEY ("subject_focus_area_id") REFERENCES "public"."subject_focus_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_app_user_id_app_users_id_fk" FOREIGN KEY ("app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_availability_overrides_tutor_date" ON "availability_overrides" USING btree ("tutor_profile_id","override_date");--> statement-breakpoint
CREATE INDEX "idx_availability_rules_tutor" ON "availability_rules" USING btree ("tutor_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_job_runs_idempotency_key" ON "job_runs" USING btree ("idempotency_key") WHERE idempotency_key IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_job_runs_status_retry" ON "job_runs" USING btree ("job_status","next_retry_at");--> statement-breakpoint
CREATE INDEX "idx_job_runs_job_type" ON "job_runs" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "idx_tutor_credentials_tutor" ON "tutor_credentials" USING btree ("tutor_profile_id");--> statement-breakpoint
CREATE INDEX "idx_tutor_lang_caps_tutor" ON "tutor_language_capabilities" USING btree ("tutor_profile_id");--> statement-breakpoint
CREATE INDEX "idx_tutor_profiles_public_slug" ON "tutor_profiles" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "idx_tutor_profiles_listing_status" ON "tutor_profiles" USING btree ("public_listing_status");--> statement-breakpoint
CREATE INDEX "idx_tutor_subject_caps_tutor" ON "tutor_subject_capabilities" USING btree ("tutor_profile_id");--> statement-breakpoint
CREATE INDEX "idx_tutor_subject_caps_subject" ON "tutor_subject_capabilities" USING btree ("subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_webhook_events_provider_event" ON "webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_processing_status" ON "webhook_events" USING btree ("processing_status");