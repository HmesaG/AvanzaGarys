-- CreateTable
CREATE TABLE `planes_grow` (
    `id` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'LIDERAZGO',
    `semanaActual` INTEGER NOT NULL DEFAULT 1,
    `totalSemanas` INTEGER NOT NULL DEFAULT 4,
    `estado` ENUM('ACTIVO', 'EN_SEGUIMIENTO', 'PAUSADO', 'CERRADO') NOT NULL DEFAULT 'ACTIVO',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `planes_grow_clienteId_idx`(`clienteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sesiones_grow` (
    `id` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `semana` INTEGER NOT NULL,
    `etapa` ENUM('GOAL', 'REALITY', 'OPTIONS', 'WILL') NOT NULL,
    `respuestas` JSON NULL,
    `notaCoach` TEXT NULL,
    `completadaAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sesiones_grow_planId_idx`(`planId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `compromisos_grow` (
    `id` VARCHAR(191) NOT NULL,
    `sesionId` VARCHAR(191) NOT NULL,
    `accion` TEXT NOT NULL,
    `fechaPrevista` DATETIME(3) NOT NULL,
    `estado` ENUM('PENDIENTE', 'CUMPLIDO', 'NO_CUMPLIDO') NOT NULL DEFAULT 'PENDIENTE',
    `resultado` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `compromisos_grow_sesionId_idx`(`sesionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `planes_grow` ADD CONSTRAINT `planes_grow_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sesiones_grow` ADD CONSTRAINT `sesiones_grow_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `planes_grow`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compromisos_grow` ADD CONSTRAINT `compromisos_grow_sesionId_fkey` FOREIGN KEY (`sesionId`) REFERENCES `sesiones_grow`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
