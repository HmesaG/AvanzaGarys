# 🚀 Guía Oficial de Despliegue en Producción — AvanzA Coaching Platform

Esta guía detalla los pasos para desplegar la plataforma **AvanzA** en un servidor de producción utilizando **Docker y Docker Compose**, garantizando alta disponibilidad, aislamiento de procesos, persistencia de datos y certificados SSL automáticos.

---

## 📋 1. Requisitos Previos del Servidor

* **Sistema Operativo:** Ubuntu 22.04 / 24.04 LTS o Debian 12 (64 bits).
* **Hardware Recomendado:**
  * **Mínimo:** 1 vCPU, 2 GB de RAM, 20 GB SSD.
  * **Recomendado:** 2 vCPU, 4 GB de RAM, 40 GB SSD.
* **Dominio:** Un dominio o subdominio apuntando mediante un registro DNS tipo `A` a la IP pública del servidor (ej. `coaching.tudominio.com`).

---

## 🛠️ 2. Preparación Inicial del Servidor (Ubuntu/Debian)

Conéctate por SSH a tu servidor y ejecuta:

```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias básicas
sudo apt install -y curl git ufw fail2ban

# Configurar Firewall UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (Caddy / Nginx)
sudo ufw allow 443/tcp   # HTTPS SSL
sudo ufw --force enable
```

### Instalar Docker y Docker Compose Oficial

```bash
# Descargar e instalar Docker
curl -fsSL https://get.docker.com | sudo sh

# Agregar tu usuario al grupo docker (para no usar sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalación
docker --version
docker compose version
```

---

## 📦 3. Clonar y Configurar AvanzA

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/HmesaG/AvanzaGarys.git /opt/avanza
   cd /opt/avanza
   ```

2. **Configurar las variables de producción:**
   ```bash
   cp .env.production.example .env.production
   nano .env.production
   ```

   *Genera contraseñas seguras con `openssl rand -hex 24` para `DB_PASSWORD`, `DB_ROOT_PASSWORD` y `REDIS_PASSWORD`.*

   ```env
   APP_PORT=3000
   ALLOWED_ORIGINS=https://coaching.tudominio.com

   DB_NAME=avanza_prod
   DB_USER=avanza_app
   DB_PASSWORD=clave_generada_super_segura
   DB_ROOT_PASSWORD=clave_root_super_segura

   REDIS_PASSWORD=clave_redis_super_segura

   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM="AvanzA Coaching <notificaciones@tudominio.com>"

   GEMINI_API_KEY=tu_api_key_opcional
   ```

---

## 🚀 4. Despliegue con Docker Compose

Ejecuta el despliegue en un solo comando:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### ¿Qué hace este comando automáticamente?
1. Descarga e inicializa el contenedor de **MariaDB 11** con collation `utf8mb4_unicode_ci` y volumen persistente.
2. Descarga e inicializa **Redis 7** con persistencia appendonly y contraseña.
3. El servicio `db-init` sincroniza automáticamente el esquema de Prisma en MariaDB una vez que la base de datos responde saludablemente.
4. Construye la imagen multi-stage de **Next.js 15 Standalone** (optimizada, sin librerías de desarrollo innecesarias y ejecutada bajo un usuario no-root `nextjs`).
5. Expone el servidor web en el puerto `3000` de forma segura.

### Verificar estado de los contenedores:
```bash
docker compose -f docker-compose.prod.yml ps
```

---

## 👤 5. Crear el Usuario Administrador Inicial

Una vez que los contenedores estén corriendo, crea la cuenta del Administrador principal:

```bash
docker compose -f docker-compose.prod.yml exec -e ADMIN_EMAIL="admin@tudominio.com" -e ADMIN_PASSWORD="TuContraseñaSegura2026!" app node scripts/seed-production.mjs
```

---

## 🔒 6. Configurar Dominio y Certificado SSL Gratuito (Caddy)

La forma más rápida, segura y recomendada de publicar tu sitio con HTTPS automático es **Caddy Server**:

```bash
# Instalar Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy -y
```

Editar el archivo de configuración `/etc/caddy/Caddyfile`:

```caddyfile
coaching.tudominio.com {
    reverse_proxy localhost:3000
    encode gzip zstd
}
```

Reiniciar Caddy:
```bash
sudo systemctl restart caddy
```
*¡Listo! Caddy aprovisionará automáticamente el certificado SSL Let's Encrypt de 2048 bits.*

---

## 🔄 7. Proceso de Actualización Continua (Zero Downtime)

Cuando realices cambios en el repositorio, actualiza el servidor con:

```bash
cd /opt/avanza
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

---

## 💾 8. Copias de Seguridad Automáticas (Backup Diario)

Crea un script de backup diario en `/opt/avanza/backup.sh`:

```bash
#!/bin/bash
FECHA=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/opt/avanza/backups"
mkdir -p $BACKUP_DIR

# Respaldo MariaDB
docker compose -f /opt/avanza/docker-compose.prod.yml exec -T mariadb mysqldump -u avanza_app -p"$DB_PASSWORD" avanza_prod > "$BACKUP_DIR/avanza_db_$FECHA.sql"

# Comprimir
gzip "$BACKUP_DIR/avanza_db_$FECHA.sql"

# Mantener solo los últimos 14 días
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +14 -delete
```

Programar en crontab (`crontab -e`):
```cron
0 3 * * * /bin/bash /opt/avanza/backup.sh
```

---

## 🩺 9. Monitoreo y Healthcheck

Puedes consultar en cualquier momento el estado del sistema en vivo:
```bash
curl http://localhost:3000/api/health
```
Respuesta esperada:
```json
{
  "estado": "saludable",
  "servicios": {
    "baseDatos": { "estado": "ok" },
    "redis": { "estado": "ok" }
  },
  "entorno": "production"
}
```
