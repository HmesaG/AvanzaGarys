#!/bin/bash
# Se ejecuta una sola vez, al inicializar el volumen de datos de MariaDB
# (docker-entrypoint-initdb.d). Crea una base de datos "shadow" separada y le
# da permisos al usuario de aplicación SOLO sobre esa base — necesaria para
# que `prisma migrate dev` pueda detectar drift sin darle al usuario de la
# app privilegios de CREATE/DROP sobre la base de datos real.
set -e

mariadb -u root -p"$MARIADB_ROOT_PASSWORD" <<-EOSQL
  CREATE DATABASE IF NOT EXISTS avanza_shadow;
  GRANT ALL PRIVILEGES ON avanza_shadow.* TO '$MARIADB_USER'@'%';
  FLUSH PRIVILEGES;
EOSQL
