#!/bin/sh
set -e

echo "=========================================================="
echo "🚀 AvanzA Coaching Platform - Servidor de Producción"
echo "📍 Puerto: ${PORT:-3000} | Entorno: ${NODE_ENV:-production}"
echo "=========================================================="

# Ejecutar proceso principal (node server.js)
exec "$@"
