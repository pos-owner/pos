-- Generated from drizzle/20261126061601_multi_month_payments/migration.sql by scripts/migrations.mjs. Do not edit.
-- Multi-month and advance rent payments: payment_batches, plus nullable batch_id on payments and documents.
-- Additive only; existing payments keep batch_id NULL and behave exactly as before.
-- down: DROP INDEX payments_batch_idx; DROP INDEX documents_batch_uq; ALTER TABLE payments DROP COLUMN batch_id;
--       ALTER TABLE documents DROP COLUMN batch_id; DROP TABLE payment_batches;
CREATE TABLE `payment_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`owner_id` text NOT NULL,
	`tenancy_id` integer NOT NULL,
	`client_key` text NOT NULL,
	`amount` integer NOT NULL,
	`months` integer NOT NULL,
	`method` text NOT NULL,
	`utr` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`recorded_by` text,
	`paid_on` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`void_reason` text DEFAULT '' NOT NULL,
	`voided_by` text,
	`voided_at` integer,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_payment_batches_owner_id_profiles_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`),
	CONSTRAINT `fk_payment_batches_tenancy_id_tenancies_id_fk` FOREIGN KEY (`tenancy_id`) REFERENCES `tenancies`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_payment_batches_recorded_by_profiles_id_fk` FOREIGN KEY (`recorded_by`) REFERENCES `profiles`(`id`),
	CONSTRAINT `fk_payment_batches_voided_by_profiles_id_fk` FOREIGN KEY (`voided_by`) REFERENCES `profiles`(`id`),
	CONSTRAINT "payment_batches_status_check" CHECK("status" in ('pending', 'confirmed', 'rejected', 'void')),
	CONSTRAINT "payment_batches_method_check" CHECK("method" in ('upi', 'cash', 'bank')),
	CONSTRAINT "payment_batches_amount_check" CHECK("amount" > 0),
	CONSTRAINT "payment_batches_months_check" CHECK("months" >= 1)
);
--> statement-breakpoint
ALTER TABLE `documents` ADD `batch_id` integer REFERENCES payment_batches(id);--> statement-breakpoint
ALTER TABLE `payments` ADD `batch_id` integer REFERENCES payment_batches(id);--> statement-breakpoint
CREATE UNIQUE INDEX `documents_batch_uq` ON `documents` (`batch_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_batches_owner_key_uq` ON `payment_batches` (`owner_id`,`client_key`);--> statement-breakpoint
CREATE INDEX `payment_batches_tenancy_idx` ON `payment_batches` (`tenancy_id`);--> statement-breakpoint
CREATE INDEX `payments_batch_idx` ON `payments` (`batch_id`);
