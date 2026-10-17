# AvanzA — Plataforma Integral de Coaching Ejecutivo & Deportivo (GROW)

Plataforma digital para la gestión integral de programas de Coaching Profesional bajo el modelo **GROW** y estándares de la **International Coaching Federation (ICF)**. Diseñada para operar en entorno Web y Mobile-first (PWA) con soporte integral para tres líneas de asesoría: **Personal**, **Corporativo / B2B** y **Deportivo**.

---

## 🌟 Características Principales

### 1. Gestión Integral de Sesiones y Citas
* **Sincronización Multicalendario:** Exportación nativa e interactiva a Google Calendar, Outlook Web y descarga directa en formato `.ics` (RFC 5545).
* **Salas Virtuales y Videollamadas:** Asignación automática o personalizada de salas de reunión (Google Meet, Zoom, Teams o Jitsi Meet) con acceso directo en 1 clic para coachee y coach.
* **Bitácora Confidencial:** Registro de notas de sesión, observaciones emocionales, acuerdos y tareas convenidas entre coach y cliente.
* **Reporte Oficial Imprimible ICF:** Hoja membretada oficial con competencias ICF, acuerdos, metas GROW y áreas de firma para coach y coachee (`@media print` optimizado).

### 2. Finanzas y Pagos
* **Múltiples Métodos:** Tarjeta de Crédito/Débito, Transferencia Bancaria y Efectivo.
* **Subida de Comprobante / Voucher:** Módulo interactivo con cuentas bancarias dominicanas (Banco Popular) y subida segura de fotos o PDFs de transferencias con previsualización para el staff.
* **Exportación de Reportes Financieros:** Descarga en formato CSV compatible con Microsoft Excel (con codificación UTF-8 BOM).

### 3. Chat en Tiempo Real y Copiloto IA
* **Mensajería Bidireccional:** Comunicación instantánea entre cliente y su coach asignado.
* **Notas de Voz y Multimedia:** Envío y reproducción de audios nativos (`<audio controls>`), previsualización de imágenes y tarjetas de descarga de documentos.
* **Copiloto IA de Coaching:** Generador de sugerencias empáticas basadas en la metodología GROW para coaches.
* **Notificaciones Push:** Service Worker integrado para avisos en segundo plano.

### 4. Modelo Metodológico GROW
* **Goal (Meta):** Objetivos medibles y alcanzables.
* **Reality (Realidad):** Diagnóstico inicial, clima laboral o perfil deportivo.
* **Options (Opciones):** Alternativas y caminos de acción.
* **Will / Wrap-up (Compromiso):** Plan de desarrollo y tareas verificables.

### 5. Auditoría ICF (Coaching Log)
* Exportación oficial del **Coaching Log ICF** en formato CSV / Excel con detalle de fechas, clientes, horas acumuladas, modalidades y bitácoras para certificaciones (ACC, PCC, MCC).

---

## 🏗️ Arquitectura y Tecnologías

* **Frontend:** [Next.js 15 (App Router)](https://nextjs.org/), React 19, TypeScript, Tailwind CSS, Lucide Icons, SweetAlert2.
* **Backend:** Next.js Route Handlers (Edge & Node.js Runtime), JWT con cookies HttpOnly seguras.
* **Base de Datos:** MariaDB 11 con [Prisma ORM 7](https://www.prisma.io/).
* **Caché y Sesiones:** Redis 7 (con soporte de failover en memoria).
* **Testing:** Suite E2E nativa en caliente ([`scripts/test-e2e.mjs`](scripts/test-e2e.mjs)) con 11 pruebas automatizadas de extremo a extremo.

---

## 🚀 Puesta en Marcha Local

### Prerrequisitos
* Node.js v20+ o v24
* Docker & Docker Compose (para MariaDB y Redis)

### Puertos Asignados
| Servicio | Puerto Configurado | Descripción |
|---|---|---|
| **Next.js Web** | `3005` | Servidor web y API (`0.0.0.0:3005`) |
| **MariaDB** | `3307` | Base de datos relacional (`localhost:3307`) |
| **Redis** | `6380` | Servidor de caché y rate-limiting (`localhost:6380`) |

### Instalación y Ejecución

1. **Clonar e instalar dependencias:**
   ```bash
   git clone https://github.com/HmesaG/AvanzaGarys.git
   cd AvanzaGarys
   npm install
   ```

2. **Levantar contenedores de infraestructura:**
   ```bash
   docker-compose up -d
   ```

3. **Sincronizar base de datos con Prisma:**
   ```bash
   npm run db:push    # o: node --env-file=.env ./node_modules/prisma/build/index.js db push
   ```

4. **Sembrar datos iniciales (Seed):**
   ```bash
   node --env-file=.env --experimental-strip-types prisma/seed.ts
   ```

5. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:3005`.

---

## 🧪 Pruebas Automatizadas (E2E)

Para ejecutar la suite completa de pruebas en caliente contra los servicios activos:

```bash
npm test
```

### Cobertura de Pruebas:
1. Healthcheck (`/api/health`) con estado de MariaDB y Redis.
2. Autenticación Administrador (`/api/auth/login`).
3. Renderizado y Métricas del Panel Administrativo (`/admin`).
4. Centro de Alertas Prioritarias del Sistema (`/api/admin/alertas`).
5. Autenticación Coachee / Cliente (`/api/auth/login`).
6. Estado del Programa y Progreso GROW (`/api/cliente/estado`).
7. Copiloto IA de Coaching Ontológico (`/api/cliente/mensajes/ia-copiloto`).
8. Motor Cron de Recordatorios y Notificaciones (`/api/cron/recordatorios`).
9. Cartera y Asignación de Coaches (`/api/admin/coaches`).
10. Bitácora Confidencial de Sesión (`/api/admin/citas/[id]/notas`).
11. Chat en Vivo Bidireccional Coach ↔ Coachee (`/api/admin/clientes/[id]/mensajes`).

---

## 🔒 Usuarios de Demostración (Seed)

| Rol | Correo Electrónico | Contraseña |
|---|---|---|
| **Administrador** | `admin@avanza.do` | `Admin123!` |
| **Coach** | `coach@avanza.do` | `Coach123!` |
| **Coachee (Cliente)** | `cliente@avanza.do` | `Cliente123!` |

---

## 📂 Estructura del Código

```text
├── app/
│   ├── admin/             # Panel administrativo, citas, clientes, empresas, planes GROW
│   ├── agenda/            # Agenda del cliente, reserva de citas y enlace a salas virtuales
│   ├── api/               # Endpoints REST (auth, citas, clientes, mensajes, cron, reportes)
│   ├── evaluacion/        # Cuestionario diagnóstico GROW
│   ├── mensajes/          # Chat en vivo para el coachee (texto, audios y adjuntos)
│   ├── plan-grow/         # Plan de desarrollo y metas acordadas
│   ├── programa/          # Revisión de programa, consentimiento y registro de pago con voucher
├── components/            # Componentes reutilizables (BotonCalendario, MensajeBubbleContent, etc.)
├── lib/                   # Lógica de negocio, consultas Prisma, alertas, validaciones y formato
├── prisma/                # Esquema de base de datos (schema.prisma) y migraciones
├── public/                # Assets estáticos, PWA manifest y Service Worker (sw.js)
└── scripts/               # Scripts de testing E2E (test-e2e.mjs)
```
