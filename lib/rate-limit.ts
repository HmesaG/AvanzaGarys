// Rate limiting con ventana fija sobre Redis.
//
// Ventana fija (no sliding window): más simple y suficiente para frenar fuerza
// bruta en login. El peor caso teórico es 2x el límite en el borde entre dos
// ventanas, aceptable para este uso.
import { redis } from "./redis";

export type ResultadoLimite = {
  permitido: boolean;
  /** Intentos restantes en la ventana actual (0 si ya se superó). */
  restantes: number;
  /** Segundos hasta que la ventana se reinicie. */
  resetEnSegundos: number;
};

export async function limitarTasa(
  clave: string,
  limite: number,
  ventanaSegundos: number,
): Promise<ResultadoLimite> {
  const key = `rl:${clave}`;

  // INCR + EXPIRE (si es clave nueva) + TTL en un solo round-trip atómico.
  // Compatible con Redis < 7 (Redis 5/6 en Windows no soporta el flag 'NX' en EXPIRE).
  const LUA_RATE_LIMIT = `
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    local ttl = redis.call('TTL', KEYS[1])
    return {current, ttl}
  `;

  const resultados = (await redis.eval(
    LUA_RATE_LIMIT,
    1,
    key,
    ventanaSegundos,
  )) as [number, number];

  if (!resultados) {
    throw new Error("Redis no devolvió resultado para el rate limit");
  }

  const conteo = Number(resultados[0] ?? 0);
  const ttl = Number(resultados[1] ?? ventanaSegundos);

  return {
    permitido: conteo <= limite,
    restantes: Math.max(0, limite - conteo),
    resetEnSegundos: ttl > 0 ? ttl : ventanaSegundos,
  };
}

/**
 * Limpia el contador. Se usa tras un login exitoso para que un usuario legítimo
 * que se equivocó varias veces no quede bloqueado el resto de la ventana.
 */
export async function resetearLimite(clave: string): Promise<void> {
  await redis.del(`rl:${clave}`);
}
