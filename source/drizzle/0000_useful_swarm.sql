CREATE TABLE `materials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`unit` text DEFAULT 'Stück' NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`packed` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `needs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`material_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`date` text DEFAULT '' NOT NULL,
	`period` text DEFAULT '' NOT NULL,
	`unit_name` text DEFAULT '' NOT NULL,
	`person` text DEFAULT '' NOT NULL,
	`project` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action
);
