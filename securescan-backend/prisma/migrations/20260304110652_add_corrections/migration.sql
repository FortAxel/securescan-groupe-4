/*
  Warnings:

  - You are about to drop the column `fixAi` on the `findings` table. All the data in the column will be lost.
  - You are about to drop the column `fixStatus` on the `findings` table. All the data in the column will be lost.
  - You are about to drop the column `fixTemplate` on the `findings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `analyses_projectId_fkey` ON `analyses`;

-- DropIndex
DROP INDEX `findings_analysisId_fkey` ON `findings`;

-- DropIndex
DROP INDEX `fix_branches_analysisId_fkey` ON `fix_branches`;

-- DropIndex
DROP INDEX `projects_userId_fkey` ON `projects`;

-- AlterTable
ALTER TABLE `findings` DROP COLUMN `fixAi`,
    DROP COLUMN `fixStatus`,
    DROP COLUMN `fixTemplate`;

-- CreateTable
CREATE TABLE `corrections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `findingId` INTEGER NOT NULL,
    `type` ENUM('SQL_INJECTION', 'XSS', 'SECRET', 'DEPENDENCY', 'PLAINTEXT_PASSWORD') NOT NULL,
    `originalSnippet` TEXT NOT NULL,
    `fixedSnippet` TEXT NOT NULL,
    `status` ENUM('PENDING', 'VALIDATED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analyses` ADD CONSTRAINT `analyses_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `findings` ADD CONSTRAINT `findings_analysisId_fkey` FOREIGN KEY (`analysisId`) REFERENCES `analyses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `corrections` ADD CONSTRAINT `corrections_findingId_fkey` FOREIGN KEY (`findingId`) REFERENCES `findings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fix_branches` ADD CONSTRAINT `fix_branches_analysisId_fkey` FOREIGN KEY (`analysisId`) REFERENCES `analyses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
