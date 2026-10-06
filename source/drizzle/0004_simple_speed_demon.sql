CREATE TABLE `portal_wishes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`material_id` integer NOT NULL,
	`requester` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit` text NOT NULL,
	`image_key` text,
	`request_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`fulfilled_at` integer,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portal_wishes_request_key_unique` ON `portal_wishes` (`request_key`);