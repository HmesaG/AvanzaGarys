// Almacén de sesiones en Redis.
//
// Modelo: `sess:<sessionId>` -> JSON {userId, rol, loginAt, expiresAt}, TTL 7 días.
// El sessionId es un token opaco de 32 bytes aleatorios (base64url): no lleva
// información del usuario, así que no se puede falsificar ni derivar. La única
// fuente de verdad es Redis — invalidar una sesión es borrar la clave.
import { randomBytes } from "node:crypto";
import { redis } from "./redis";
import { SESSION_TTL_SECONDS } from "./auth-constants";
import type { Rol } from "../generated/prisma/client";

export type Sesion = {
  userId: string;
  rol: Rol;
  /** ISO 8601 */
  loginAt: string;
  /** ISO 8601 */
  expiresAt: string;
};

function claveSesion(sessionId: string): string {
  return `sess:${sessionId}`;
}

/** Token de sesión: 32 bytes de entropía criptográfica (256 bits). */
export function generarSessionId(): string {
  return randomBytes(32).toString("base64url");
}

export async function crearSesion(
  userId: string,
  rol: Rol,
): Promise<{ sessionId: string; sesion: Sesion }> {
  const ahora = new Date();
  const sesion: Sesion = {
    userId,
    rol,
    loginAt: ahora.toISOString(),
    expiresAt: new Date(ahora.getTime() + SESSION_TTL_SECONDS * 1000).toISOString(),
  };

  const sessionId = generarSessionId();
  await redis.set(claveSesion(sessionId), JSON.stringify(sesion), "EX", SESSION_TTL_SECONDS);

  return { sessionId, sesion };
}

export async function getSession(sessionId: string | undefined): Promise<Sesion | null> {
  if (!sessionId) return null;

  const bruto = await redis.get(claveSesion(sessionId));
  if (!bruto) return null;

  let sesion: Sesion;
  try {
    sesion = JSON.parse(bruto) as Sesion;
  } catch {
    // Valor corrupto: tratarlo como sesión inválida y limpiarlo.
    await redis.del(claveSesion(sessionId));
    return null;
  }

  // Defensa en profundidad: el TTL de Redis ya expira la clave, pero si por
  // alguna razón sobrevivió (restore de un dump viejo) igual la rechazamos.
  if (Date.parse(sesion.expiresAt) <= Date.now()) {
    await redis.del(claveSesion(sessionId));
    return null;
  }

  return sesion;
}

export async function destruirSesion(sessionId: string | undefined): Promise<void> {
  if (!sessionId) return;
  await redis.del(claveSesion(sessionId));
}
