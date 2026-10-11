-- AlterTable
ALTER TABLE `pagos` ADD COLUMN `metodo` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `programas` ADD COLUMN `consentimientoAceptado` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `consentimientoAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `tareas` (
    `id` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `completada` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tareas_clienteId_idx`(`clienteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `diagnosticos` (
    `id` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `climaLaboral` VARCHAR(255) NOT NULL,
    `principalDesafio` VARCHAR(255) NOT NULL,
    `nivelComunicacion` ENUM('BUENA', 'REGULAR', 'DEFICIENTE') NOT NULL,
    `objetivoEmpresa` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `diagnosticos_clienteId_key`(`clienteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tareas` ADD CONSTRAINT `tareas_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diagnosticos` ADD CONSTRAINT `diagnosticos_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
