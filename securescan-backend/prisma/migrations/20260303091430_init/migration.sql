-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sourceType` ENUM('GIT', 'ZIP') NOT NULL,
    `sourceUrl` VARCHAR(191) NULL,
    `localPath` VARCHAR(191) NULL,
    `language` VARCHAR(191) NULL,
    `framework` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'CLONING', 'ANALYZING', 'DONE', 'ERROR') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `analyses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `score` INTEGER NULL,
    `grade` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'RUNNING', 'DONE', 'ERROR') NOT NULL DEFAULT 'PENDING',
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `findings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `analysisId` INTEGER NOT NULL,
    `tool` ENUM('SEMGREP', 'NPM_AUDIT', 'TRUFFLEHOG') NOT NULL,
    `severity` ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO') NOT NULL,
    `owaspCategory` ENUM('A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10') NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `filePath` VARCHAR(191) NULL,
    `lineStart` INTEGER NULL,
    `lineEnd` INTEGER NULL,
    `rawOutput` JSON NULL,
    `fixStatus` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'APPLIED') NOT NULL DEFAULT 'PENDING',
    `fixTemplate` TEXT NULL,
    `fixAi` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fix_branches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `analysisId` INTEGER NOT NULL,
    `branchName` VARCHAR(191) NOT NULL,
    `pushStatus` ENUM('PENDING', 'PUSHED', 'ERROR') NOT NULL DEFAULT 'PENDING',
    `reportPath` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analyses` ADD CONSTRAINT `analyses_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `findings` ADD CONSTRAINT `findings_analysisId_fkey` FOREIGN KEY (`analysisId`) REFERENCES `analyses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fix_branches` ADD CONSTRAINT `fix_branches_analysisId_fkey` FOREIGN KEY (`analysisId`) REFERENCES `analyses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
