-- ============================================================================
-- AvanzA Platform — Esquema Completo de Producción para Hostinger (hPanel / phpMyAdmin)
-- Motor: MySQL 8.0+ / MariaDB 10.6+ (InnoDB, utf8mb4_unicode_ci)
--
-- Instrucciones de importación en Hostinger hPanel:
-- 1. Ir a Base de datos > Gestión > Crear nueva base de datos MySQL y usuario.
-- 2. Abrir phpMyAdmin para la base de datos recién creada.
-- 3. Ir a la pestaña "Importar", seleccionar este archivo (`produccion-hostinger.sql`) y pulsar "Importar".
-- 4. Ingresar con el usuario Administrador inicial y cambiar la contraseña de inmediato.
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tabla: usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `rol` ENUM('ADMINISTRADOR', 'COACH', 'SECRETARIA', 'CLIENTE') NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `esquemaHonorario` ENUM('SIN_DEFINIR', 'PORCENTAJE', 'FIJO_POR_SESION', 'FIJO_MENSUAL') NOT NULL DEFAULT 'SIN_DEFINIR',
    `valorHonorario` DECIMAL(10, 2) NULL,
    `disponibilidadJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla: empresas
CREATE TABLE IF NOT EXISTS `empresas` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `ruc` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla: clientes
CREATE TABLE IF NOT EXISTS `clientes` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `linea` ENUM('PERSONAL', 'CORPORATIVO', 'DEPORTIVO') NOT NULL,
    `empresaId` VARCHAR(191) NULL,
    `coachId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `clientes_usuarioId_key`(`usuarioId`),
    INDEX `clientes_coachId_idx`(`coachId`),
    INDEX `clientes_empresaId_idx`(`empresaId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `clientes_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `clientes_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `clientes_coachId_fkey` FOREIGN KEY (`coachId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla: evaluaciones
CREATE TABLE IF NOT EXISTS `evaluaciones` (
    `id` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `objetivoPrincipal` TEXT NOT NULL,
    `principalDificultad` TEXT NULL,
    `tiempoObjetivo` VARCHAR(191) NULL,
    `respuestas` JSON NOT NULL,
    `revisadaPorId` VARCHAR(191) NULL,
    `revisadaAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `evaluaciones_clienteId_idx`(`clienteId`),
    INDEX `evaluaciones_revisadaPorId_idx`(`revisadaPorId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `evaluaciones_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `evaluaciones_revisadaPorId_fkey` FOREIGN KEY (`revisadaPorId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla: programas
CREATE TABLE IF NOT EXISTS `programas` (
    `id` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `progreso` INTEGER NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `consentimientoAceptado` BOOLEAN NOT NULL DEFAULT false,
    `consentimientoAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `programas_clienteId_idx`(`clienteId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `programas_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabla: citas
CREATE TABLE IF NOT EXISTS `citas` (
    `id` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `coachId` VARCHAR(191) NULL,
    `fecha` DATETIME(3) NOT NULL,
    `modalidad` VARCHAR(191) NOT NULL DEFAULT 'Virtual',
    `estado` ENUM('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA') NOT NULL DEFAULT 'PENDIENTE',
    `notas` TEXT NULL,
    `enlaceReunion` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `citas_clienteId_idx`(`clienteId`),
    INDEX `citas_coachId_idx`(`coachId`),
    INDEX `citas_fecha_idx`(`fecha`),
    PRIMARY KEY (`id`),
    CONSTRAINT `citas_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `citas_coachId_fkey` FOREIGN KEY (`coachId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabla: pagos
CREATE TABLE IF NOT EXISTS `pagos` (
    `id` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `estado` ENUM('PENDIENTE', 'PAGADO', 'VENCIDO', 'CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
    `concepto` VARCHAR(191) NULL,
    `metodo` VARCHAR(191) NULL,
    `fechaPago` DATETIME(3) NULL,
    `comprobanteUrl` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `pagos_clienteId_idx`(`clienteId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `pagos_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabla: tareas
CREATE TABLE IF NOT EXISTS `tareas` (
    `id` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `completada` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tareas_clienteId_idx`(`clienteId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `tareas_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabla: planes_grow
CREATE TABLE IF NOT EXISTS `planes_grow` (
    `id` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'LIDERAZGO',
    `semanaActual` INTEGER NOT NULL DEFAULT 1,
    `totalSemanas` INTEGER NOT NULL DEFAULT 4,
    `estado` ENUM('ACTIVO', 'EN_SEGUIMIENTO', 'PAUSADO', 'CERRADO') NOT NULL DEFAULT 'ACTIVO',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `planes_grow_clienteId_idx`(`clienteId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `planes_grow_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tabla: sesiones_grow
CREATE TABLE IF NOT EXISTS `sesiones_grow` (
    `id` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `semana` INTEGER NOT NULL,
    `etapa` ENUM('GOAL', 'REALITY', 'OPTIONS', 'WILL') NOT NULL,
    `respuestas` JSON NULL,
    `notaCoach` TEXT NULL,
    `completadaAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sesiones_grow_planId_idx`(`planId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `sesiones_grow_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `planes_grow`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Tabla: compromisos_grow
CREATE TABLE IF NOT EXISTS `compromisos_grow` (
    `id` VARCHAR(191) NOT NULL,
    `sesionId` VARCHAR(191) NOT NULL,
    `accion` TEXT NOT NULL,
    `fechaPrevista` DATETIME(3) NOT NULL,
    `estado` ENUM('PENDIENTE', 'CUMPLIDO', 'NO_CUMPLIDO') NOT NULL DEFAULT 'PENDIENTE',
    `resultado` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `compromisos_grow_sesionId_idx`(`sesionId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `compromisos_grow_sesionId_fkey` FOREIGN KEY (`sesionId`) REFERENCES `sesiones_grow`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Tabla: diagnosticos
CREATE TABLE IF NOT EXISTS `diagnosticos` (
    `id` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `climaLaboral` VARCHAR(255) NOT NULL,
    `principalDesafio` VARCHAR(255) NOT NULL,
    `nivelComunicacion` ENUM('BUENA', 'REGULAR', 'DEFICIENTE') NOT NULL,
    `objetivoEmpresa` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `diagnosticos_clienteId_key`(`clienteId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `diagnosticos_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Tabla: diagnosticos_deportivos
CREATE TABLE IF NOT EXISTS `diagnosticos_deportivos` (
    `id` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `disciplina` VARCHAR(255) NOT NULL,
    `categoria` VARCHAR(255) NOT NULL,
    `metaCompetitiva` TEXT NOT NULL,
    `bloqueoMental` TEXT NOT NULL,
    `nivelDescansoNutricion` VARCHAR(100) NOT NULL,
    `horasEntrenamientoSemana` INTEGER NOT NULL DEFAULT 10,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `diagnosticos_deportivos_clienteId_key`(`clienteId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `diagnosticos_deportivos_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Tabla: mensajes
CREATE TABLE IF NOT EXISTS `mensajes` (
    `id` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `deId` VARCHAR(191) NOT NULL,
    `texto` TEXT NOT NULL,
    `leido` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mensajes_clienteId_idx`(`clienteId`),
    INDEX `mensajes_deId_idx`(`deId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `mensajes_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `mensajes_deId_fkey` FOREIGN KEY (`deId`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- Semilla de Usuarios Administradores Iniciales para Producción
-- Credenciales iniciales (Contraseña temporal para todos: Admin123!):
--   1. Dueño Principal: garyspanigua10@gmail.com
--   2. Administrador:   hmesag@gmail.com
--   3. Respaldo:        admin@avanza.do
-- IMPORTANTE: Cambiar las contraseñas inmediatamente tras el primer inicio de sesión.
-- ============================================================================
INSERT INTO `usuarios` (`id`, `email`, `passwordHash`, `nombre`, `rol`, `activo`, `createdAt`, `updatedAt`)
VALUES
(
    'cm0owner00000000000000001',
    'garyspanigua10@gmail.com',
    '$2b$10$vrn9.G3urM56K8DeRhrvmO2H0efzkxThJiuysUH20Zu5mI.1OJBEW',
    'Gary Paniagua (Dueño)',
    'ADMINISTRADOR',
    true,
    NOW(3),
    NOW(3)
),
(
    'cm0hector0000000000000002',
    'hmesag@gmail.com',
    '$2b$10$vrn9.G3urM56K8DeRhrvmO2H0efzkxThJiuysUH20Zu5mI.1OJBEW',
    'Héctor Mesa (Admin)',
    'ADMINISTRADOR',
    true,
    NOW(3),
    NOW(3)
),
(
    'cm0admin00000000000000001',
    'admin@avanza.do',
    '$2b$10$vrn9.G3urM56K8DeRhrvmO2H0efzkxThJiuysUH20Zu5mI.1OJBEW',
    'Administrador Principal',
    'ADMINISTRADOR',
    true,
    NOW(3),
    NOW(3)
)
ON DUPLICATE KEY UPDATE
    `rol` = 'ADMINISTRADOR',
    `activo` = true,
    `updatedAt` = NOW(3);
