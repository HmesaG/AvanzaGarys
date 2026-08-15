// Cliente Redis singleton — Fase 3a.
//
// Mismo patrón de `lib/prisma.ts`: la instancia vive en `globalThis` para que
// el hot-reload de Next.js en desarrollo no abra una conexión nueva por cada
// recarga de módulo (ioredis mantiene un socket TCP abierto por instancia).
//
// Solo para runtime Node.js — ioredis usa `net`/`tls`, no corre en Edge.

import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    // Falla rápido en vez de encolar comandos indefinidamente si Redis está caído:
    // un request de sesión que no puede resolverse debe devolver error, no colgarse.
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

  client.on("error", (error) => {
    console.error("[redis] error de conexión:", error.message);
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
