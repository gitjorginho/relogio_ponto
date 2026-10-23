-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',
    `registration` VARCHAR(191) NULL,
    `document` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `position` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_registration_key`(`registration`),
    UNIQUE INDEX `users_document_key`(`document`),
    INDEX `users_active_idx`(`active`),
    INDEX `users_department_idx`(`department`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL DEFAULT '08:00',
    `endTime` VARCHAR(191) NOT NULL DEFAULT '17:00',
    `breakMinutes` INTEGER NOT NULL DEFAULT 60,
    `workdays` VARCHAR(191) NOT NULL DEFAULT '1,2,3,4,5',
    `toleranceMinutes` INTEGER NOT NULL DEFAULT 10,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `work_schedules_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `time_records` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('CLOCK_IN', 'BREAK_START', 'BREAK_END', 'CLOCK_OUT') NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `source` ENUM('WEB', 'MOBILE', 'API', 'MANUAL') NOT NULL DEFAULT 'WEB',
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `accuracy` DOUBLE NULL,
    `ipAddress` VARCHAR(191) NULL,
    `device` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `voided` BOOLEAN NOT NULL DEFAULT false,
    `voidedReason` VARCHAR(191) NULL,
    `voidedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `time_records_userId_recordedAt_idx`(`userId`, `recordedAt`),
    INDEX `time_records_recordedAt_idx`(`recordedAt`),
    INDEX `time_records_voided_idx`(`voided`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `work_schedules` ADD CONSTRAINT `work_schedules_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_records` ADD CONSTRAINT `time_records_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
