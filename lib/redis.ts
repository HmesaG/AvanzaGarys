// Singleton de ioredis. Mismo patrón que `lib/prisma.ts`: en desarrollo el
// hot-reload de Next re-evalúa los módulos y sin el singleton se abriría una
// conexión nueva por recarga hasta agotar el pool de Redis.
//
// Sin degradación silenciosa: si Redis está caído los errores se propagan
// (ADR 007, decisión 4 — mejor fallar visible que servir datos obsoletos).
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function crearCliente(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "REDIS_URL no está definida. Copiá .env.example a .env (ver docker-compose.yml).",
    );
  }

  const cliente = new Redis(url, {
    // No reintentar indefinidamente: preferimos un error rápido y visible.
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
  });

  // ioredis emite 'error' de forma asíncrona; sin listener Node tumba el proceso.
  cliente.on("error", (error) => {
    console.error("[redis] error de conexión:", error.message);
  });

  return cliente;
}

export const redis = globalForRedis.redis ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
