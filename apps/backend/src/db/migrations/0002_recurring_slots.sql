ALTER TABLE `care_tasks` RENAME COLUMN `recur_start_md` TO `recur_start_slot`;--> statement-breakpoint
ALTER TABLE `care_tasks` RENAME COLUMN `recur_end_md` TO `recur_end_slot`;--> statement-breakpoint
UPDATE `care_tasks`
SET `recur_start_slot` = substr(`recur_start_slot`, 1, 2) || '-' ||
  CASE
    WHEN cast(substr(`recur_start_slot`, 4, 2) AS INTEGER) <= 10 THEN '1'
    WHEN cast(substr(`recur_start_slot`, 4, 2) AS INTEGER) <= 20 THEN '2'
    ELSE '3'
  END
WHERE `recur_start_slot` LIKE '__-__';--> statement-breakpoint
UPDATE `care_tasks`
SET `recur_end_slot` = substr(`recur_end_slot`, 1, 2) || '-' ||
  CASE
    WHEN cast(substr(`recur_end_slot`, 4, 2) AS INTEGER) <= 10 THEN '1'
    WHEN cast(substr(`recur_end_slot`, 4, 2) AS INTEGER) <= 20 THEN '2'
    ELSE '3'
  END
WHERE `recur_end_slot` LIKE '__-__';
