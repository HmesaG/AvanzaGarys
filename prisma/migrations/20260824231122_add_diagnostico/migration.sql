-- CreateTable
CREATE TABLE `diagnosticos` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `clima_laboral` TEXT NOT NULL,
    `principal_desafio` TEXT NOT NULL,
    `nivel_comunicacion` VARCHAR(191) NOT NULL,
    `objetivo_empresa` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `diagnosticos_cliente_id_key`(`cliente_id`),
    INDEX `diagnosticos_cliente_id_idx`(`cliente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `diagnosticos` ADD CONSTRAINT `diagnosticos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
