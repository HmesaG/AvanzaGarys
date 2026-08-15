// Rate limiting sobre Redis — Fase 3a.
//
// Ventana fija con INCR + EXPIRE: la primera petición de la ventana crea la
// clave y le pone TTL; las siguientes solo incrementan. Es aproximado en los
// bordes de la ventana, pero suficiente para frenar fuerza bruta de credenciales
// y mucho más simple que un sliding window.
//
// Si Redis no responde, se DENIEGA (fail closed). El resto de la app degrada a
// base de datos cuando el cache falla, pero un limitador que se abre solo ante
// una caída de Redis es exactamente lo que un atacante provocaría.

import { redis } from "./redis";

export type ResultadoRateLimit = {
  permitido: boolean;
  /** Segundos que faltan para que se libere la ventana (0 si está permitido). */
  reintentarEn: number;
};

/**
 * Identificador del cliente para limitar. `x-forwarded-for` solo es confiable
 * detrás de un reverse proxy propio; en desarrollo (sin proxy) es falsificable,
 * por eso el límite por IP se combina siempre con un límite por identidad
 * (el correo del intento de login), que no se puede rotar tan fácil.
 */
export function ipDeLaPeticion(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "desconocida";
}

export async function consumirRateLimit(
  clave: string,
  maxIntentos: number,
  ventanaSegundos: number,
): Promise<ResultadoRateLimit> {
  const key = `ratelimit:${clave}`;

  try {
    const intentos = await redis.incr(key);
    if (intentos === 1) {
      await redis.expire(key, ventanaSegundos);
    }

    if (intentos > maxIntentos) {
      const ttl = await redis.ttl(key);
      return { permitido: false, reintentarEn: ttl > 0 ? ttl : ventanaSegundos };
    }

    return { permitido: true, reintentarEn: 0 };
  } catch (error) {
    console.error(`[rate-limit] Redis no disponible (${clave}):`, error);
    // Fail closed: sin Redis no hay forma de contar intentos.
    return { permitido: false, reintentarEn: ventanaSegundos };
  }
}

/** Borra el contador (se llama tras un login exitoso). */
export async function limpiarRateLimit(clave: string): Promise<void> {
  try {
    await redis.del(`ratelimit:${clave}`);
  } catch (error) {
    console.error(`[rate-limit] limpieza fallida (${clave}):`, error);
  }
}

export function respuestaRateLimit(reintentarEn: number): Response {
  return Response.json(
    { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
    { status: 429, headers: { "Retry-After": String(reintentarEn) } },
  );
}
