# Guía Oficial de Despliegue en Producción — AvanzA Coaching Platform

Esta guía detalla las dos opciones oficiales para desplegar **AvanzA** en producción:

- **Opción A (Principal — Recomendada):** Despliegue en **Hostinger Web / Cloud Hosting (hPanel)** con Aplicación Web Node.js nativa y MySQL gestionado.
- **Opción B (Alternativa):** Despliegue en **Hostinger VPS (Ubuntu/Debian)** utilizando **Docker Compose** y Caddy Server.

---

## Opción A: Despliegue en Hostinger Web / Cloud Hosting con hPanel (Principal)

Esta modalidad aprovecha el gestor de **Aplicaciones Web Node.js** y **MySQL** incluido en el panel **hPanel** de Hostinger, sin necesidad de administrar contenedores Docker ni servidores Redis externos.

### 1. Crear la Base de Datos MySQL en hPanel

1. Ingresa a **hPanel** y ve a **Bases de datos → Gestión de MySQL**.
2. En la sección **Crear una nueva base de datos MySQL y un usuario de base de datos**, define:
   - **Nombre de la base de datos MySQL:** ej. `u123456789_avanza`
   - **Nombre de usuario MySQL:** ej. `u123456789_admin`
   - **Contraseña:** genera una contraseña segura y guárdala para el paso 4.
3. Pulsa **Crear**.

---

### 2. Inicializar las Tablas y el Administrador (2 vías a elegir)

Puedes inicializar las 14 tablas del sistema y el usuario Administrador inicial por cualquiera de estas dos vías:

#### Vía 1 (Recomendada en hPanel — 1 clic en phpMyAdmin)
1. En **Bases de datos → phpMyAdmin**, haz clic en **Entrar a phpMyAdmin** junto a la base de datos recién creada (`u123456789_avanza`).
2. Ve a la pestaña superior **Importar** (`Import`).
3. Selecciona el archivo **`prisma/produccion-hostinger.sql`** incluido en este repositorio y pulsa **Importar** (`Go`).
4. Esto crea automáticamente las **14 tablas** con codificación `utf8mb4_unicode_ci`, todas sus claves foráneas e índices, y el usuario **Administrador inicial**:
   - **Email:** `admin@avanza.do`
   - **Contraseña temporal:** `Admin123!`
   - *(Importante: cambia la contraseña inmediatamente después del primer inicio de sesión).*

#### Vía 2 (Por terminal SSH de Hostinger)
Si tienes acceso SSH habilitado en tu plan de Hostinger, sitúate en el directorio de la aplicación y ejecuta:

```bash
npm run db:push
ADMIN_EMAIL="admin@tudominio.com" ADMIN_PASSWORD="TuPasswordSegura!" npm run db:seed:prod
```

---

### 3. Configurar la Aplicación Web Node.js en hPanel

1. En **hPanel**, ve a **Sitios web → Añadir sitio web → Aplicación web Node.js** (o dentro de tu sitio existente en **Avanzado → Node.js**).
2. Conecta el repositorio de GitHub **`HmesaG/AvanzaGarys`** (rama **`main`**) o sube los archivos del proyecto.
3. Configura los parámetros de compilación y ejecución:
   - **Versión de Node.js:** `20.x` o `22.x`
   - **Comando de compilación (Build command):** `npm run build`
   - **Archivo de inicio (Entry file):** `server.js` *(o comando de arranque `npm run start`)*

> **Nota técnica:** El script `postinstall` y `npm run build` ejecutan automáticamente `node ./node_modules/prisma/build/index.js generate` antes de `next build`, y `server.js` levanta el servidor HTTP de Next.js escuchando en el puerto inyectado por hPanel (`process.env.PORT`).

---

### 4. Variables de Entorno en hPanel

En la configuración de tu aplicación Node.js en hPanel (**Variables de entorno**), añade las siguientes variables:

```env
NODE_ENV=production
DATABASE_URL=mysql://u123456789_admin:TU_PASSWORD@127.0.0.1:3306/u123456789_avanza
REDIS_URL=memory
ALLOWED_ORIGINS=https://tudominio.com
CRON_SECRET=un_secreto_aleatorio_largo
```

#### Detalle de las variables:
- **`NODE_ENV=production`**: Activa las optimizaciones de producción y cookies seguras (`Secure`).
- **`DATABASE_URL`**: Cadena de conexión MySQL con el usuario, contraseña y base de datos creados en el Paso 1 (usando `127.0.0.1:3306`).
- **`REDIS_URL=memory`**: Activa el almacén en memoria con soporte de TTL integrado en `lib/redis.ts`, permitiendo gestionar sesiones, caché y *rate limiting* sin requerir un servidor Redis externo. *(Si deseas usar un Redis externo como Upstash Redis, coloca aquí tu URL `rediss://...`).*
- **`ALLOWED_ORIGINS=https://tudominio.com`**: Dominio público autorizado para cabeceras CORS y seguridad.
- **`CRON_SECRET`**: Cadena aleatoria larga (ej. generada con `openssl rand -hex 24`) para proteger el endpoint `/api/cron/recordatorios`.
- **Variables opcionales (Notificaciones, IA y Pagos):**
  - `RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx` (envío de correos transaccionales vía Resend; si se omite, el sistema opera en modo *dry-run* seguro).
  - `EMAIL_FROM="AvanzA Coaching <notificaciones@tudominio.com>"`
  - `GEMINI_API_KEY`, `OPENAI_API_KEY` o `ANTHROPIC_API_KEY` (clave API opcional para el Copiloto IA de coaching).
  - `PAYMENTS_WEBHOOK_SECRET` (secreto opcional para autenticar webhooks de pasarelas de pago).

Guarda las variables y reinicia la aplicación Node.js desde hPanel.

---

### 5. Configurar Tarea Cron de Recordatorios en hPanel

Para que la plataforma envíe automáticamente los recordatorios de citas próximas (24h) y compromisos GROW por vencer (48h):

1. En **hPanel**, ve a **Avanzado → Tareas Cron (Cron Jobs)**.
2. Selecciona tipo **Personalizado** (o frecuencia **Una vez al día**, ej. `0 8 * * *`) y configura el comando:

```bash
curl -s -X POST -H "Authorization: Bearer TU_CRON_SECRET" https://tudominio.com/api/cron/recordatorios
```

*(Reemplaza `TU_CRON_SECRET` por el valor exacto configurado en `CRON_SECRET` y `tudominio.com` por tu dominio).*

---

## Opción B: Despliegue en Hostinger VPS con Docker Compose

Si prefieres desplegar en un servidor **VPS de Hostinger** con Ubuntu 22.04 / 24.04 LTS o Debian 12, el repositorio incluye una arquitectura completa en contenedores (`docker-compose.prod.yml` y `Dockerfile` multi-stage).

### 1. Requisitos y Preparación del VPS

- **Hardware recomendado:** 2 vCPU, 4 GB RAM, 40 GB SSD (mínimo 1 vCPU, 2 GB RAM, 20 GB SSD).
- **Dominio:** Registro DNS tipo `A` apuntando a la IP pública del VPS.

Conéctate por SSH al VPS y prepara el entorno y el firewall:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban

# Configurar Firewall UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (Caddy)
sudo ufw allow 443/tcp   # HTTPS SSL (Caddy)
sudo ufw --force enable

# Instalar Docker y Docker Compose Oficial
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clonar el Repositorio y Configurar `.env.production`

```bash
git clone https://github.com/HmesaG/AvanzaGarys.git /opt/avanza
cd /opt/avanza
cp .env.production.example .env.production
nano .env.production
```

Ajusta los valores en `.env.production` (puedes generar claves con `openssl rand -hex 24`):

```env
APP_PORT=3000
ALLOWED_ORIGINS=https://tudominio.com

DB_NAME=avanza_prod
DB_USER=avanza_app
DB_PASSWORD=clave_generada_super_segura
DB_ROOT_PASSWORD=clave_root_super_segura

REDIS_PASSWORD=clave_redis_super_segura
CRON_SECRET=clave_cron_super_segura

RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="AvanzA Coaching <notificaciones@tudominio.com>"
GEMINI_API_KEY=tu_api_key_opcional
```

### 3. Levantar los Contenedores con Docker Compose

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

#### Arquitectura del despliegue en Docker Compose:
1. **`mariadb` (`mariadb:11`):** Base de datos con `utf8mb4_unicode_ci` y volumen persistente `avanza_prod_mariadb_data`.
2. **`redis` (`redis:7-alpine`):** Caché y sesiones con persistencia `appendonly` y contraseña obligatoria.
3. **`db-init`:** Sincroniza automáticamente el esquema de Prisma (`prisma db push --skip-generate`) cuando MariaDB reporta estado saludable.
4. **`app`:** Imagen `runner` multi-stage de Next.js 15 Standalone ejecutada bajo el usuario sin privilegios `nextjs` (incluye `public`, `generated`, `prisma` y `scripts/seed-production.mjs`). Escucha exclusivamente en `127.0.0.1:${APP_PORT:-3000}:3000` para quedar protegida detrás del proxy inverso Caddy.

### 4. Crear el Usuario Administrador Inicial en el VPS

Como `scripts/seed-production.mjs` ya está incluido dentro de la imagen `runner` del contenedor `app`, ejecuta directamente:

```bash
docker compose -f docker-compose.prod.yml exec -e ADMIN_EMAIL="admin@tudominio.com" -e ADMIN_PASSWORD="TuPasswordSegura2026!" app node scripts/seed-production.mjs
```

### 5. Configurar Reverse Proxy y SSL Automático con Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy -y
```

Configura `/etc/caddy/Caddyfile` apuntando a `127.0.0.1:3000`:

```caddyfile
tudominio.com {
    reverse_proxy 127.0.0.1:3000
    encode gzip zstd
}
```

Reinicia Caddy para aprovisionar el certificado HTTPS automáticamente:

```bash
sudo systemctl restart caddy
```

### 6. Actualización Continua y Backups en VPS

Para actualizar el servidor ante nuevos cambios en la rama `main`:

```bash
cd /opt/avanza
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Para respaldos diarios de MariaDB en el VPS (`/opt/avanza/backup.sh` en `crontab -e`):

```bash
0 3 * * * docker compose -f /opt/avanza/docker-compose.prod.yml exec -T mariadb mysqldump -u avanza_app -p"TU_DB_PASSWORD" avanza_prod | gzip > /opt/avanza/backups/avanza_db_$(date +\%Y\%m\%d).sql.gz
```

---

## Verificación y Healthcheck (`/api/health`)

Tanto en **Hostinger hPanel (Opción A)** como en **Hostinger VPS (Opción B)**, puedes verificar en vivo el estado de la base de datos y del motor de sesiones/caché consultando:

```bash
curl https://tudominio.com/api/health
```

Respuesta esperada (`HTTP 200 OK`):

```json
{
  "estado": "saludable",
  "entorno": "production",
  "timestamp": "2026-11-04T22:00:00.000Z",
  "uptimeSegundos": 120,
  "latenciaTotalMs": 4,
  "memoriaMb": 95,
  "servicios": {
    "baseDatos": { "estado": "ok", "latenciaMs": 3 },
    "redis": { "estado": "ok", "latenciaMs": 1 }
  }
}
```
