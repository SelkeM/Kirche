CREATE TABLE `material_stocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`material_id` integer NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`packed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `needs` ADD `start_time` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `needs` ADD `end_time` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `needs` ADD `request_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `needs_request_key_unique` ON `needs` (`request_key`);