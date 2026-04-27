CREATE TABLE `auditlog` (
	`id` varchar(36) NOT NULL,
	`userId` varchar(36),
	`action` varchar(255) NOT NULL,
	`success` tinyint NOT NULL,
	`ip` varchar(255),
	`userAgent` text,
	`metadata` json,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `auditlog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `division` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `division_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluationevent` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('PERIODIC','PROKER') NOT NULL,
	`isOpen` tinyint NOT NULL DEFAULT 1,
	`startDate` datetime NOT NULL,
	`endDate` datetime NOT NULL,
	`periodId` varchar(36) NOT NULL,
	`prokerId` varchar(36),
	`createdAt` datetime NOT NULL,
	CONSTRAINT `evaluationevent_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluationscore` (
	`id` varchar(36) NOT NULL,
	`evaluationId` varchar(36) NOT NULL,
	`indicatorSnapshotId` varchar(36) NOT NULL,
	`score` int NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `evaluationscore_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluation` (
	`id` varchar(36) NOT NULL,
	`evaluatorId` varchar(36) NOT NULL,
	`evaluateeId` varchar(36) NOT NULL,
	`eventId` varchar(36) NOT NULL,
	`feedback` text,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `evaluation_id` PRIMARY KEY(`id`),
	CONSTRAINT `evaluation_evaluatorId_evaluateeId_eventId_unique` UNIQUE(`evaluatorId`,`evaluateeId`,`eventId`)
);
--> statement-breakpoint
CREATE TABLE `indicatorsnapshot` (
	`id` varchar(36) NOT NULL,
	`indicatorId` varchar(36) NOT NULL,
	`eventId` varchar(36) NOT NULL,
	CONSTRAINT `indicatorsnapshot_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `indicator` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`evaluatorRole` enum('ADMIN','BPI','KADIV','ANGGOTA','KASUBDIV') NOT NULL,
	`evaluateeRole` enum('ADMIN','BPI','KADIV','ANGGOTA','KASUBDIV') NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `indicator_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `panitia` (
	`id` varchar(36) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`prokerId` varchar(36) NOT NULL,
	CONSTRAINT `panitia_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `period` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 0,
	`startYear` int NOT NULL,
	`endYear` int NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `period_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proker` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`divisionId` varchar(36) NOT NULL,
	`periodId` varchar(36) NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `proker_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subdivision` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`divisionId` varchar(36) NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `subdivision_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`nim` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`role` enum('ADMIN','BPI','KADIV','ANGGOTA','KASUBDIV') NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`passwordHash` varchar(255) NOT NULL,
	`passwordUpdatedAt` datetime,
	`periodId` varchar(36) NOT NULL,
	`divisionId` varchar(36),
	`subdivisionId` varchar(36),
	`createdAt` datetime NOT NULL,
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_nim_unique` UNIQUE(`nim`)
);
--> statement-breakpoint
CREATE INDEX `AuditLog_action_idx` ON `auditlog` (`action`);--> statement-breakpoint
CREATE INDEX `AuditLog_userId_idx` ON `auditlog` (`userId`);