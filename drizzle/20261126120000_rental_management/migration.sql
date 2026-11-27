-- Rental management: lease history, move-out settlements, pro-rating and late fees, notifications and Web Push,
-- offline-entry keys, PAN, locale and recurring expenses. Additive only: new tables, and nullable or defaulted columns.
--
-- down: DROP TABLE push_subscriptions; DROP TABLE notifications; DROP TABLE charge_adjustments (after the
--       fee triggers in the next migration); DROP TABLE settlement_deductions; DROP TABLE settlements;
--       DROP TABLE lease_terms; the new columns can stay (they are ignored by older code), or be dropped with
--       ALTER TABLE ... DROP COLUMN after dropping their indexes.
CREATE TABLE `charge_adjustments` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`owner_id` text NOT NULL,
	`charge_id` integer NOT NULL,
	`kind` text DEFAULT 'late_fee' NOT NULL,
	`period` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`waived_at` integer,
	`waived_by` text,
	`waive_reason` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_charge_adjustments_owner_id_profiles_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`),
	CONSTRAINT `fk_charge_adjustments_charge_id_charges_id_fk` FOREIGN KEY (`charge_id`) REFERENCES `charges`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_charge_adjustments_waived_by_profiles_id_fk` FOREIGN KEY (`waived_by`) REFERENCES `profiles`(`id`),
	CONSTRAINT "charge_adjustments_kind_check" CHECK("kind" in ('late_fee')),
	CONSTRAINT "charge_adjustments_amount_check" CHECK("amount" > 0)
);
--> statement-breakpoint
CREATE TABLE `lease_terms` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`owner_id` text NOT NULL,
	`tenancy_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`rent` integer NOT NULL,
	`due_day` integer NOT NULL,
	`deposit` integer DEFAULT 0 NOT NULL,
	`reason` text DEFAULT 'initial' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_lease_terms_owner_id_profiles_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`),
	CONSTRAINT `fk_lease_terms_tenancy_id_tenancies_id_fk` FOREIGN KEY (`tenancy_id`) REFERENCES `tenancies`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_lease_terms_created_by_profiles_id_fk` FOREIGN KEY (`created_by`) REFERENCES `profiles`(`id`),
	CONSTRAINT "lease_terms_reason_check" CHECK("reason" in ('initial', 'renewal', 'revision')),
	CONSTRAINT "lease_terms_rent_check" CHECK("rent" > 0)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`owner_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`url` text DEFAULT '/' NOT NULL,
	`entity` text DEFAULT '' NOT NULL,
	`entity_id` text,
	`dedupe_key` text NOT NULL,
	`read_at` integer,
	`pushed_at` integer,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_notifications_owner_id_profiles_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`),
	CONSTRAINT `fk_notifications_recipient_id_profiles_id_fk` FOREIGN KEY (`recipient_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text DEFAULT '' NOT NULL,
	`auth` text DEFAULT '' NOT NULL,
	`user_agent` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_push_subscriptions_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_push_subscriptions_owner_id_profiles_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`)
);
--> statement-breakpoint
CREATE TABLE `recurring_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`owner_id` text NOT NULL,
	`property_id` integer NOT NULL,
	`category` text NOT NULL,
	`amount` integer NOT NULL,
	`frequency` text DEFAULT 'monthly' NOT NULL,
	`next_date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_recurring_expenses_owner_id_profiles_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`),
	CONSTRAINT `fk_recurring_expenses_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_recurring_expenses_created_by_profiles_id_fk` FOREIGN KEY (`created_by`) REFERENCES `profiles`(`id`),
	CONSTRAINT "recurring_expenses_frequency_check" CHECK("frequency" in ('monthly', 'quarterly', 'half_yearly', 'yearly')),
	CONSTRAINT "recurring_expenses_amount_check" CHECK("amount" > 0)
);
--> statement-breakpoint
CREATE TABLE `settlement_deductions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`settlement_id` integer NOT NULL,
	`kind` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_settlement_deductions_settlement_id_settlements_id_fk` FOREIGN KEY (`settlement_id`) REFERENCES `settlements`(`id`) ON DELETE CASCADE,
	CONSTRAINT "settlement_deductions_kind_check" CHECK("kind" in ('damage', 'rent', 'utility', 'other')),
	CONSTRAINT "settlement_deductions_amount_check" CHECK("amount" > 0)
);
--> statement-breakpoint
CREATE TABLE `settlements` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`owner_id` text NOT NULL,
	`tenancy_id` integer NOT NULL,
	`move_out_date` text NOT NULL,
	`deposit_held` integer DEFAULT 0 NOT NULL,
	`outstanding_rent` integer DEFAULT 0 NOT NULL,
	`pending_utilities` integer DEFAULT 0 NOT NULL,
	`advance_unused` integer DEFAULT 0 NOT NULL,
	`refund_amount` integer DEFAULT 0 NOT NULL,
	`refund_status` text DEFAULT 'pending' NOT NULL,
	`refund_method` text DEFAULT '' NOT NULL,
	`refund_ref` text DEFAULT '' NOT NULL,
	`refund_paid_on` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`number` text DEFAULT '' NOT NULL,
	`finalized_at` integer,
	`finalized_by` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_settlements_owner_id_profiles_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`),
	CONSTRAINT `fk_settlements_tenancy_id_tenancies_id_fk` FOREIGN KEY (`tenancy_id`) REFERENCES `tenancies`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_settlements_finalized_by_profiles_id_fk` FOREIGN KEY (`finalized_by`) REFERENCES `profiles`(`id`),
	CONSTRAINT "settlements_status_check" CHECK("status" in ('draft', 'final')),
	CONSTRAINT "settlements_refund_status_check" CHECK("refund_status" in ('pending', 'paid'))
);
--> statement-breakpoint
ALTER TABLE `charges` ADD `rent_part` integer;--> statement-breakpoint
ALTER TABLE `charges` ADD `prorated_days` integer;--> statement-breakpoint
ALTER TABLE `charges` ADD `fees` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `expenses` ADD `client_key` text;--> statement-breakpoint
ALTER TABLE `expenses` ADD `recurring_id` integer REFERENCES recurring_expenses(id);--> statement-breakpoint
ALTER TABLE `expenses` ADD `period` text;--> statement-breakpoint
ALTER TABLE `maintenance_requests` ADD `client_key` text;--> statement-breakpoint
ALTER TABLE `meter_readings` ADD `client_key` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `pan` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `locale` text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `tenancies` ADD `move_out_date` text;--> statement-breakpoint
ALTER TABLE `tenants` ADD `pan` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `charge_adjustments_charge_kind_period_uq` ON `charge_adjustments` (`charge_id`,`kind`,`period`);--> statement-breakpoint
CREATE INDEX `charge_adjustments_owner_idx` ON `charge_adjustments` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `expenses_client_key_uq` ON `expenses` (`client_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `expenses_recurring_period_uq` ON `expenses` (`recurring_id`,`period`);--> statement-breakpoint
CREATE INDEX `lease_terms_tenancy_idx` ON `lease_terms` (`tenancy_id`,`start_date`);--> statement-breakpoint
CREATE INDEX `lease_terms_owner_idx` ON `lease_terms` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `maintenance_requests_client_key_uq` ON `maintenance_requests` (`client_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `meter_readings_client_key_uq` ON `meter_readings` (`client_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_dedupe_uq` ON `notifications` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `notifications_recipient_idx` ON `notifications` (`recipient_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_owner_idx` ON `notifications` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_uq` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_idx` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `recurring_expenses_owner_idx` ON `recurring_expenses` (`owner_id`);--> statement-breakpoint
CREATE INDEX `settlement_deductions_settlement_idx` ON `settlement_deductions` (`settlement_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `settlements_tenancy_uq` ON `settlements` (`tenancy_id`);--> statement-breakpoint
CREATE INDEX `settlements_owner_idx` ON `settlements` (`owner_id`);