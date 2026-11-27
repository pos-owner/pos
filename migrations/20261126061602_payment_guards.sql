-- Generated from drizzle/20261126061602_payment_guards/migration.sql by scripts/migrations.mjs. Do not edit.
-- Money invariants enforced by the database itself (see worker/server/domain/payments.ts).
--
-- D1 has no interactive transactions. A multi-month payment is written as one `db.batch` (one transaction); if any
-- month no longer fits, the trigger below aborts and the whole batch rolls back, so a payment never lands half-way.
-- The same rule backs up the single-month path, whose guarded statements already never break it.
--
-- down: DROP TRIGGER payments_confirmed_fit_insert; DROP TRIGGER payments_confirmed_fit_update;
--       DROP TRIGGER payments_batch_claim_insert; DROP TRIGGER payments_batch_tenancy_insert;
--       then (previous migration) DROP TABLE payment_batches after clearing payments.batch_id / documents.batch_id.

-- A confirmed payment can never take a month's confirmed total above what the month costs.
CREATE TRIGGER `payments_confirmed_fit_insert` BEFORE INSERT ON `payments`
WHEN NEW.`status` = 'confirmed'
BEGIN
  SELECT RAISE(ABORT, 'pos:payment_exceeds_due')
  WHERE NEW.`amount` > (SELECT `amount` FROM `charges` WHERE `id` = NEW.`charge_id`)
    - coalesce((SELECT sum(`amount`) FROM `payments` WHERE `charge_id` = NEW.`charge_id` AND `status` = 'confirmed'), 0);
END;
--> statement-breakpoint
CREATE TRIGGER `payments_confirmed_fit_update` BEFORE UPDATE OF `status` ON `payments`
WHEN NEW.`status` = 'confirmed' AND OLD.`status` <> 'confirmed'
BEGIN
  SELECT RAISE(ABORT, 'pos:payment_exceeds_due')
  WHERE NEW.`amount` > (SELECT `amount` FROM `charges` WHERE `id` = NEW.`charge_id`)
    - coalesce((SELECT sum(`amount`) FROM `payments` WHERE `charge_id` = NEW.`charge_id` AND `status` = 'confirmed'), 0);
END;
--> statement-breakpoint
-- A tenant's multi-month "I have paid" claim: each month must still be due, and must not already have a claim waiting.
CREATE TRIGGER `payments_batch_claim_insert` BEFORE INSERT ON `payments`
WHEN NEW.`status` = 'pending' AND NEW.`batch_id` IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'pos:payment_pending_exists')
  WHERE EXISTS (SELECT 1 FROM `payments` WHERE `charge_id` = NEW.`charge_id` AND `status` = 'pending');
  SELECT RAISE(ABORT, 'pos:payment_exceeds_due')
  WHERE NEW.`amount` > (SELECT `amount` FROM `charges` WHERE `id` = NEW.`charge_id`)
    - coalesce((SELECT sum(`amount`) FROM `payments` WHERE `charge_id` = NEW.`charge_id` AND `status` = 'confirmed'), 0);
END;
--> statement-breakpoint
-- Every month of a batch belongs to the batch's own tenancy.
CREATE TRIGGER `payments_batch_tenancy_insert` BEFORE INSERT ON `payments`
WHEN NEW.`batch_id` IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'pos:payment_wrong_tenancy')
  WHERE (SELECT `tenancy_id` FROM `charges` WHERE `id` = NEW.`charge_id`)
    IS NOT (SELECT `tenancy_id` FROM `payment_batches` WHERE `id` = NEW.`batch_id`);
END;
