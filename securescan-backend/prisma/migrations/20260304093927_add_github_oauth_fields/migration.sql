/*
  Warnings:

  - A unique constraint covering the columns `[githubId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `githubAccessToken` TEXT NULL,
    ADD COLUMN `githubId` VARCHAR(191) NULL,
    ADD COLUMN `githubTokenExpiresAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_githubId_key` ON `users`(`githubId`);
