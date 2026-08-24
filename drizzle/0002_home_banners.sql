CREATE TABLE IF NOT EXISTS `home_banners` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text,
	`subtitle` text,
	`desktop_image_url` text NOT NULL,
	`mobile_image_url` text NOT NULL,
	`cta_text` text,
	`cta_url` text,
	`link_type` text DEFAULT 'internal' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_home_banners_active_sort` ON `home_banners` (`is_active`,`sort_order`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_home_banners_schedule` ON `home_banners` (`starts_at`,`ends_at`);
