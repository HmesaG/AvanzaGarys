// Helper cache-aside sobre Redis — Fase 3a.
//
// Las lecturas del panel admin (dashboard, listados) pasan por `getOrSetCache`
// con TTL corto; cada mutación invalida explícitamente las claves afectadas con
// `invalidateCache`. Si Redis no responde, se degrada a ir directo a la base de
// datos: el cache nunca debe ser un punto único de falla para una lectura.

import { redis } from "./redis";

/** Prefijos de clave usados por los route handlers, centralizados para invalidar sin typos. */
export const CACHE_KEYS = {
  dashboard: (rol: string, usuarioId: string) => `cache:admin:dashboard:${rol}:${usuarioId}`,
  dashboardPattern: "cache:admin:dashboard:*",
  evaluacionesPendientes: (usuarioId: string) => `cache:admin:evaluaciones:pendientes:${usuarioId}`,
  evaluacionesPendientesPattern: "cache:admin:evaluaciones:pendientes:*",
  clientes: (usuarioId: string) => `cache:admin:clientes:${usuarioId}`,
  clientesPattern: "cache:admin:clientes:*",
  citas: (usuarioId: string) => `cache:admin:citas:${usuarioId}`,
  citasPattern: "cache:admin:citas:*",
} as const;

export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    console.error(`[cache] lectura fallida (${key}):`, error);
  }

  const fresh = await fetcher();

  try {
    await redis.set(key, JSON.stringify(fresh), "EX", ttlSeconds);
  } catch (error) {
    console.error(`[cache] escritura fallida (${key}):`, error);
  }

  return fresh;
}

/**
 * Borra una clave exacta, o todas las que matcheen si el argumento contiene `*`.
 * Usa SCAN en vez de KEYS para no bloquear Redis con datasets grandes.
 */
export async function invalidateCache(keyOrPattern: string): Promise<void> {
  try {
    if (!keyOrPattern.includes("*")) {
      await redis.del(keyOrPattern);
      return;
    }

    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", keyOrPattern, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch (error) {
    console.error(`[cache] invalidación fallida (${keyOrPattern}):`, error);
  }
}
