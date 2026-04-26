ALTER TABLE `care_tasks` RENAME COLUMN `due_date` TO `due_slot`;--> statement-breakpoint
UPDATE `care_tasks`
SET `due_slot` = substr(`due_slot`, 1, 7) || '-' ||
  CASE
    WHEN cast(substr(`due_slot`, 9, 2) AS INTEGER) <= 10 THEN '1'
    WHEN cast(substr(`due_slot`, 9, 2) AS INTEGER) <= 20 THEN '2'
    ELSE '3'
  END
WHERE `due_slot` LIKE '____-__-__';
