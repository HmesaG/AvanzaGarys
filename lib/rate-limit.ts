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

  // INCR + EXPIRE NX + TTL en un solo round-trip. EXPIRE NX (Redis >= 7) sólo
  // fija el TTL si la clave todavía no tiene uno, así el contador no se
  // renueva con cada intento (eso permitiría fuerza bruta indefinida).
  const resultados = await redis
    .multi()
    .incr(key)
    .expire(key, ventanaSegundos, "NX")
    .ttl(key)
    .exec();

  if (!resultados) {
    throw new Error("Redis no devolvió resultado para el rate limit");
  }

  const conteo = Number(resultados[0]?.[1] ?? 0);
  const ttl = Number(resultados[2]?.[1] ?? ventanaSegundos);

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
