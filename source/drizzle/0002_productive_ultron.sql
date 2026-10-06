CREATE TABLE `camp_units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `camp_units_name_unique` ON `camp_units` (`name`);