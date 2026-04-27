ALTER TABLE `indicator` MODIFY COLUMN `evaluatorRole` enum('ADMIN','BPI','KADIV','ANGGOTA','KASUBDIV');--> statement-breakpoint
ALTER TABLE `indicator` MODIFY COLUMN `evaluateeRole` enum('ADMIN','BPI','KADIV','ANGGOTA','KASUBDIV');--> statement-breakpoint
ALTER TABLE `indicator` ADD `type` enum('PERIODIC','PROKER') DEFAULT 'PERIODIC' NOT NULL;