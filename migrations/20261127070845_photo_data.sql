-- Generated from drizzle/20261127070845_photo_data/migration.sql by scripts/migrations.mjs. Do not edit.
CREATE TABLE `photo_data` (
	`key` text PRIMARY KEY,
	`data` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL
);

