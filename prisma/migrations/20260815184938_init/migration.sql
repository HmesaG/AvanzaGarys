-- CreateTable
CREATE TABLE `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `correo` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `rol` ENUM('ADMINISTRADOR', 'COACH', 'SECRETARIA', 'CLIENTE') NOT NULL,
    `empresa_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_correo_key`(`correo`),
    INDEX `usuarios_rol_idx`(`rol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `empresas` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `contacto` VARCHAR(191) NOT NULL,
    `correo` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clientes` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `nombre_completo` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NOT NULL,
    `edad` INTEGER NOT NULL,
    `tipo_asesoria` ENUM('PERSONAL', 'CORPORATIVO', 'DEPORTIVO') NOT NULL,
    `empresa_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `clientes_usuario_id_key`(`usuario_id`),
    INDEX `clientes_tipo_asesoria_idx`(`tipo_asesoria`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evaluaciones` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `objetivo_principal` TEXT NOT NULL,
    `principal_dificultad` TEXT NOT NULL,
    `tiempo_deseado` VARCHAR(191) NOT NULL,
    `estado` ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
    `revisada_por_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `evaluaciones_estado_idx`(`estado`),
    INDEX `evaluaciones_cliente_id_idx`(`cliente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `programas` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `sesiones_incluidas` INTEGER NOT NULL,
    `tipo_asesoria` ENUM('PERSONAL', 'CORPORATIVO', 'DEPORTIVO') NOT NULL,
    `precio` DECIMAL(10, 2) NOT NULL,

    INDEX `programas_tipo_asesoria_idx`(`tipo_asesoria`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `programas_asignados` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `programa_id` VARCHAR(191) NOT NULL,
    `evaluacion_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `programas_asignados_cliente_id_idx`(`cliente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consentimientos` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `aceptado` BOOLEAN NOT NULL DEFAULT false,
    `fecha` DATETIME(3) NOT NULL,

    UNIQUE INDEX `consentimientos_cliente_id_key`(`cliente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pagos` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `metodo` ENUM('TARJETA', 'TRANSFERENCIA') NOT NULL,
    `estado` ENUM('PENDIENTE', 'PAGADO') NOT NULL DEFAULT 'PENDIENTE',
    `fecha` DATETIME(3) NULL,

    INDEX `pagos_cliente_id_idx`(`cliente_id`),
    INDEX `pagos_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `citas` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `fecha` DATE NOT NULL,
    `hora` VARCHAR(191) NOT NULL,
    `modalidad` ENUM('VIRTUAL', 'PRESENCIAL') NOT NULL,
    `estado` ENUM('CONFIRMADA', 'PENDIENTE') NOT NULL DEFAULT 'PENDIENTE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `citas_fecha_idx`(`fecha`),
    INDEX `citas_cliente_id_idx`(`cliente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mensajes` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `de` ENUM('CLIENTE', 'ASESOR') NOT NULL,
    `texto` TEXT NOT NULL,
    `hora` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mensajes_cliente_id_idx`(`cliente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clientes` ADD CONSTRAINT `clientes_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clientes` ADD CONSTRAINT `clientes_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evaluaciones` ADD CONSTRAINT `evaluaciones_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evaluaciones` ADD CONSTRAINT `evaluaciones_revisada_por_id_fkey` FOREIGN KEY (`revisada_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `programas_asignados` ADD CONSTRAINT `programas_asignados_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `programas_asignados` ADD CONSTRAINT `programas_asignados_programa_id_fkey` FOREIGN KEY (`programa_id`) REFERENCES `programas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `programas_asignados` ADD CONSTRAINT `programas_asignados_evaluacion_id_fkey` FOREIGN KEY (`evaluacion_id`) REFERENCES `evaluaciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consentimientos` ADD CONSTRAINT `consentimientos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos` ADD CONSTRAINT `pagos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `citas` ADD CONSTRAINT `citas_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mensajes` ADD CONSTRAINT `mensajes_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
