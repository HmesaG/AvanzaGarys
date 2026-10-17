-- CreateTable
CREATE TABLE `diagnosticos_deportivos` (
    `id` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `disciplina` VARCHAR(255) NOT NULL,
    `categoria` VARCHAR(255) NOT NULL,
    `metaCompetitiva` TEXT NOT NULL,
    `bloqueoMental` TEXT NOT NULL,
    `nivelDescansoNutricion` VARCHAR(100) NOT NULL,
    `horasEntrenamientoSemana` INTEGER NOT NULL DEFAULT 10,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `diagnosticos_deportivos_clienteId_key`(`clienteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `diagnosticos_deportivos` ADD CONSTRAINT `diagnosticos_deportivos_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
