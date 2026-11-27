-- Late fees are rows in charge_adjustments; these triggers keep charges.fees and charges.amount in step, the same way
-- the meter_bill_* triggers keep charges.extra. A waived fee is never deleted: waived_at is set and the fee comes off.
-- Then the lease history is backfilled with one `initial` term per existing tenancy.
--
-- down: DROP TRIGGER charge_fee_add; DROP TRIGGER charge_fee_waive_guard; DROP TRIGGER charge_fee_waive;
--       DELETE FROM lease_terms WHERE reason = 'initial';

CREATE TRIGGER `charge_fee_add` AFTER INSERT ON `charge_adjustments`
WHEN NEW.`waived_at` IS NULL
BEGIN
  UPDATE `charges` SET `amount` = `amount` + NEW.`amount`, `fees` = `fees` + NEW.`amount` WHERE `id` = NEW.`charge_id`;
END;
--> statement-breakpoint
-- A fee that has already been paid can't be waived (the month would then show more paid than it costs); the owner
-- voids the payment first.
CREATE TRIGGER `charge_fee_waive_guard` BEFORE UPDATE OF `waived_at` ON `charge_adjustments`
WHEN OLD.`waived_at` IS NULL AND NEW.`waived_at` IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'pos:fee_already_paid')
  WHERE (SELECT `amount` FROM `charges` WHERE `id` = NEW.`charge_id`) - NEW.`amount`
    < coalesce((SELECT sum(`amount`) FROM `payments` WHERE `charge_id` = NEW.`charge_id` AND `status` = 'confirmed'), 0);
END;
--> statement-breakpoint
CREATE TRIGGER `charge_fee_waive` AFTER UPDATE OF `waived_at` ON `charge_adjustments`
WHEN OLD.`waived_at` IS NULL AND NEW.`waived_at` IS NOT NULL
BEGIN
  UPDATE `charges` SET `amount` = max(0, `amount` - NEW.`amount`), `fees` = max(0, `fees` - NEW.`amount`) WHERE `id` = NEW.`charge_id`;
END;
--> statement-breakpoint
INSERT INTO `lease_terms` (`owner_id`, `tenancy_id`, `start_date`, `end_date`, `rent`, `due_day`, `deposit`, `reason`, `note`, `created_at`)
SELECT p.`owner_id`, tn.`id`, tn.`start_date`, tn.`end_date`, tn.`rent`, tn.`due_day`, tn.`deposit`, 'initial', '',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
FROM `tenancies` tn
JOIN `units` u ON u.`id` = tn.`unit_id`
JOIN `properties` p ON p.`id` = u.`property_id`
WHERE NOT EXISTS (SELECT 1 FROM `lease_terms` lt WHERE lt.`tenancy_id` = tn.`id`);
