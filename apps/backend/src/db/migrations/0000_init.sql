CREATE TABLE `care_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`plant_id` text NOT NULL,
	`action_type` text NOT NULL,
	`custom_label` text,
	`kind` text NOT NULL,
	`recur_start_md` text,
	`recur_end_md` text,
	`due_date` text,
	`notes` text,
	`notify` integer DEFAULT true NOT NULL,
	`source` text NOT NULL,
	`ai_rationale` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`plant_id`) REFERENCES `plants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "care_tasks_action_type_check" CHECK(action_type IN ('prune', 'fertilize', 'water', 'plant', 'transplant', 'harvest', 'sow', 'mulch', 'treat', 'inspect', 'custom'))
);
--> statement-breakpoint
CREATE INDEX `care_tasks_plant_id_idx` ON `care_tasks` (`plant_id`);--> statement-breakpoint
CREATE TABLE `invites` (
	`token` text PRIMARY KEY NOT NULL,
	`email` text,
	`expires_at` text NOT NULL,
	`consumed_at` text
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`plant_id` text,
	`occurred_on` text NOT NULL,
	`action_type` text NOT NULL,
	`custom_label` text,
	`notes` text,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`plant_id`) REFERENCES `plants`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "journal_entries_action_type_check" CHECK(action_type IN ('prune', 'fertilize', 'water', 'plant', 'transplant', 'harvest', 'sow', 'mulch', 'treat', 'inspect', 'custom'))
);
--> statement-breakpoint
CREATE INDEX `journal_entries_plant_id_idx` ON `journal_entries` (`plant_id`);--> statement-breakpoint
CREATE INDEX `journal_entries_occurred_on_idx` ON `journal_entries` (`occurred_on`);--> statement-breakpoint
CREATE TABLE `journal_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`journal_id` text NOT NULL,
	`file_path` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`journal_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `journal_photos_journal_id_idx` ON `journal_photos` (`journal_id`);--> statement-breakpoint
CREATE TABLE `notification_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`care_task_id` text NOT NULL,
	`fired_for_year` integer,
	`fired_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`care_task_id`) REFERENCES `care_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_log_care_task_year_idx` ON `notification_log` (`care_task_id`,`fired_for_year`);--> statement-breakpoint
CREATE TABLE `plant_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`plant_id` text NOT NULL,
	`file_path` text NOT NULL,
	`taken_at` text,
	`caption` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`plant_id`) REFERENCES `plants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plant_photos_plant_id_idx` ON `plant_photos` (`plant_id`);--> statement-breakpoint
CREATE TABLE `plants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`species` text,
	`zone_id` text,
	`notes` text,
	`hardiness_zone` text,
	`archived_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `plants_zone_id_idx` ON `plants` (`zone_id`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`user_agent` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_idx` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_id_idx` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_completions` (
	`id` text PRIMARY KEY NOT NULL,
	`care_task_id` text NOT NULL,
	`completed_on` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`care_task_id`) REFERENCES `care_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_completions_care_task_id_idx` ON `task_completions` (`care_task_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `zones` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL
);
