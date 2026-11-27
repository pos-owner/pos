CREATE TABLE `activity_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`actor_id` text,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `app_secrets` (
	`name` text PRIMARY KEY,
	`value` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `automations` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`owner_id` text,
	`name` text NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	CONSTRAINT `fk_automations_owner_id_profiles_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`)
);
--> statement-breakpoint
CREATE TABLE `charges` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenancy_id` integer NOT NULL,
	`month` text NOT NULL,
	`amount` integer NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'due' NOT NULL,
	`extra` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `fk_charges_tenancy_id_tenancies_id_fk` FOREIGN KEY (`tenancy_id`) REFERENCES `tenancies`(`id`) ON DELETE CASCADE,
	CONSTRAINT "charges_amount_check" CHECK("amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`owner_id` text,
	`tenancy_id` integer,
	`payment_id` integer,
	`kind` text NOT NULL,
	`number` text DEFAULT '' NOT NULL,
	`path` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_documents_owner_id_profiles_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`),
	CONSTRAINT `fk_documents_tenancy_id_tenancies_id_fk` FOREIGN KEY (`tenancy_id`) REFERENCES `tenancies`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_documents_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`property_id` integer NOT NULL,
	`category` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`submitted_by` text,
	`approved` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_expenses_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_expenses_submitted_by_profiles_id_fk` FOREIGN KEY (`submitted_by`) REFERENCES `profiles`(`id`)
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`owner_id` text NOT NULL,
	`role` text NOT NULL,
	`unit_id` integer,
	`tenant_id` integer,
	`name` text DEFAULT '' NOT NULL,
	`token` text NOT NULL,
	`pin_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`claimed_by` text,
	`claimed_at` integer,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_invites_owner_id_profiles_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`),
	CONSTRAINT `fk_invites_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_invites_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_invites_claimed_by_profiles_id_fk` FOREIGN KEY (`claimed_by`) REFERENCES `profiles`(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`unit_id` integer NOT NULL,
	`raised_by` text,
	`raised_by_name` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`assigned_to` text,
	`photo_keys` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_maintenance_requests_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_maintenance_requests_raised_by_profiles_id_fk` FOREIGN KEY (`raised_by`) REFERENCES `profiles`(`id`),
	CONSTRAINT `fk_maintenance_requests_assigned_to_profiles_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `profiles`(`id`),
	CONSTRAINT "maintenance_requests_status_check" CHECK("status" in ('open', 'in_progress', 'done'))
);
--> statement-breakpoint
CREATE TABLE `meter_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`unit_id` integer,
	`kind` text DEFAULT 'electricity' NOT NULL,
	`reading` real,
	`previous` real,
	`usage` real,
	`rate` integer DEFAULT 0 NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`confidence` real,
	`photo_path` text,
	`read_on` text,
	`charge_id` integer,
	`recorded_by` text,
	`recorded_by_name` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`flag` text DEFAULT '' NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_meter_readings_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_meter_readings_charge_id_charges_id_fk` FOREIGN KEY (`charge_id`) REFERENCES `charges`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_meter_readings_recorded_by_profiles_id_fk` FOREIGN KEY (`recorded_by`) REFERENCES `profiles`(`id`),
	CONSTRAINT `fk_meter_readings_approved_by_profiles_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `profiles`(`id`),
	CONSTRAINT "meter_readings_status_check" CHECK("status" in ('pending', 'approved')),
	CONSTRAINT "meter_readings_usage_check" CHECK("usage" >= 0),
	CONSTRAINT "meter_readings_amount_check" CHECK("amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE `password_resets` (
	`token_hash` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_password_resets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`charge_id` integer NOT NULL,
	`amount` integer NOT NULL,
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
	CONSTRAINT `fk_payments_charge_id_charges_id_fk` FOREIGN KEY (`charge_id`) REFERENCES `charges`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_payments_recorded_by_profiles_id_fk` FOREIGN KEY (`recorded_by`) REFERENCES `profiles`(`id`),
	CONSTRAINT `fk_payments_voided_by_profiles_id_fk` FOREIGN KEY (`voided_by`) REFERENCES `profiles`(`id`),
	CONSTRAINT "payments_status_check" CHECK("status" in ('pending', 'confirmed', 'rejected', 'void')),
	CONSTRAINT "payments_method_check" CHECK("method" in ('upi', 'cash', 'bank')),
	CONSTRAINT "payments_amount_check" CHECK("amount" > 0)
);
--> statement-breakpoint
CREATE TABLE `photo_uploads` (
	`key` text PRIMARY KEY,
	`owner_id` text NOT NULL,
	`uploaded_by` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_photo_uploads_owner_id_profiles_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`),
	CONSTRAINT `fk_photo_uploads_uploaded_by_profiles_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `profiles`(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY,
	`role` text NOT NULL,
	`owner_id` text NOT NULL,
	`full_name` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`upi_id` text DEFAULT '' NOT NULL,
	`electricity_rate` integer DEFAULT 800 NOT NULL,
	`water_rate` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "profiles_role_check" CHECK("role" in ('owner', 'staff', 'tenant'))
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`owner_id` text NOT NULL,
	`electricity_rate` integer,
	`water_rate` integer,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_properties_owner_id_profiles_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text NOT NULL,
	`bucket` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `request_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`request_id` integer NOT NULL,
	`author_id` text,
	`author_name` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`photo_path` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_request_comments_request_id_maintenance_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `maintenance_requests`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_request_comments_author_id_profiles_id_fk` FOREIGN KEY (`author_id`) REFERENCES `profiles`(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`seen_at` integer NOT NULL,
	`user_agent` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	CONSTRAINT `fk_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `tenancies` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`unit_id` integer NOT NULL,
	`tenant_id` integer NOT NULL,
	`rent` integer NOT NULL,
	`due_day` integer DEFAULT 5 NOT NULL,
	`deposit` integer DEFAULT 0 NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	CONSTRAINT `fk_tenancies_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_tenancies_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
	CONSTRAINT "tenancies_status_check" CHECK("status" in ('active', 'ended')),
	CONSTRAINT "tenancies_rent_check" CHECK("rent" > 0),
	CONSTRAINT "tenancies_due_day_check" CHECK("due_day" between 1 and 28)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`owner_id` text NOT NULL,
	`user_id` text,
	`full_name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`id_note` text DEFAULT '' NOT NULL,
	`emergency_contact` text DEFAULT '' NOT NULL,
	`move_in_date` text,
	`deposit` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_tenants_owner_id_profiles_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`),
	CONSTRAINT `fk_tenants_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`)
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`property_id` integer NOT NULL,
	`label` text NOT NULL,
	`type` text DEFAULT '2BHK' NOT NULL,
	`base_rent` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `fk_units_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE CASCADE,
	CONSTRAINT "units_base_rent_check" CHECK("base_rent" >= 0)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`password_changed_at` integer NOT NULL,
	`last_sign_in_at` integer
);
--> statement-breakpoint
CREATE INDEX `activity_log_actor_idx` ON `activity_log` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `automations_owner_name_uq` ON `automations` (`owner_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `charges_tenancy_month_uq` ON `charges` (`tenancy_id`,`month`);--> statement-breakpoint
CREATE UNIQUE INDEX `documents_payment_uq` ON `documents` (`payment_id`);--> statement-breakpoint
CREATE INDEX `documents_tenancy_idx` ON `documents` (`tenancy_id`);--> statement-breakpoint
CREATE INDEX `expenses_property_idx` ON `expenses` (`property_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invites_token_uq` ON `invites` (`token`);--> statement-breakpoint
CREATE INDEX `invites_owner_idx` ON `invites` (`owner_id`);--> statement-breakpoint
CREATE INDEX `maintenance_requests_unit_idx` ON `maintenance_requests` (`unit_id`);--> statement-breakpoint
CREATE INDEX `meter_readings_unit_idx` ON `meter_readings` (`unit_id`,`kind`);--> statement-breakpoint
CREATE INDEX `password_resets_user_idx` ON `password_resets` (`user_id`);--> statement-breakpoint
CREATE INDEX `payments_charge_idx` ON `payments` (`charge_id`);--> statement-breakpoint
CREATE INDEX `photo_uploads_owner_idx` ON `photo_uploads` (`owner_id`);--> statement-breakpoint
CREATE INDEX `profiles_owner_idx` ON `profiles` (`owner_id`);--> statement-breakpoint
CREATE INDEX `properties_owner_idx` ON `properties` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `rate_limits_key_bucket_uq` ON `rate_limits` (`key`,`bucket`);--> statement-breakpoint
CREATE INDEX `rate_limits_updated_idx` ON `rate_limits` (`updated_at`);--> statement-breakpoint
CREATE INDEX `request_comments_request_idx` ON `request_comments` (`request_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `tenancies_unit_idx` ON `tenancies` (`unit_id`);--> statement-breakpoint
CREATE INDEX `tenancies_tenant_idx` ON `tenancies` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `tenants_user_idx` ON `tenants` (`user_id`);--> statement-breakpoint
CREATE INDEX `tenants_owner_idx` ON `tenants` (`owner_id`);--> statement-breakpoint
CREATE INDEX `units_property_idx` ON `units` (`property_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uq` ON `users` (`email`);--> statement-breakpoint
-- Meter bills follow meter_readings.charge_id. Setting the link adds the reading's amount to the charge, clearing it
-- (or moving it) takes the amount off, in the same statement as the link change. D1 has no interactive
-- transactions; with these triggers one conditional UPDATE on meter_readings is enough to apply or remove a bill
-- atomically (see worker/server/domain/meters.ts).
CREATE TRIGGER `meter_bill_add` AFTER UPDATE OF `charge_id` ON `meter_readings`
WHEN NEW.`charge_id` IS NOT NULL AND (OLD.`charge_id` IS NULL OR OLD.`charge_id` <> NEW.`charge_id`)
BEGIN
  UPDATE `charges` SET `amount` = `amount` + NEW.`amount`, `extra` = `extra` + NEW.`amount` WHERE `id` = NEW.`charge_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `meter_bill_remove` AFTER UPDATE OF `charge_id` ON `meter_readings`
WHEN OLD.`charge_id` IS NOT NULL AND (NEW.`charge_id` IS NULL OR OLD.`charge_id` <> NEW.`charge_id`)
BEGIN
  UPDATE `charges` SET `amount` = max(0, `amount` - OLD.`amount`), `extra` = max(0, `extra` - OLD.`amount`) WHERE `id` = OLD.`charge_id`;
END;
--> statement-breakpoint
-- A reading deleted while its bill is still on the rent takes the bill with it.
CREATE TRIGGER `meter_bill_delete` AFTER DELETE ON `meter_readings`
WHEN OLD.`charge_id` IS NOT NULL
BEGIN
  UPDATE `charges` SET `amount` = max(0, `amount` - OLD.`amount`), `extra` = max(0, `extra` - OLD.`amount`) WHERE `id` = OLD.`charge_id`;
END;