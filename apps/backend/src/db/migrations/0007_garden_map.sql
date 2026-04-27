CREATE TABLE `garden_map` (
	`id` text PRIMARY KEY DEFAULT 'main' NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`cells` blob NOT NULL,
	`zone_index` text DEFAULT '[]' NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "garden_map_singleton_check" CHECK("garden_map"."id" = 'main')
);
--> statement-breakpoint
ALTER TABLE `zones` ADD `kind` text DEFAULT 'area' NOT NULL;--> statement-breakpoint
ALTER TABLE `zones` ADD `color_token` text DEFAULT 'moss' NOT NULL;