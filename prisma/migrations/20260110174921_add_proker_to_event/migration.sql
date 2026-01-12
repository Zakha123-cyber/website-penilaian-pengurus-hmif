-- AlterTable
ALTER TABLE `evaluationevent` ADD COLUMN `prokerId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `EvaluationEvent` ADD CONSTRAINT `EvaluationEvent_prokerId_fkey` FOREIGN KEY (`prokerId`) REFERENCES `Proker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
