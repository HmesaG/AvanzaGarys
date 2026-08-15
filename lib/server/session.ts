// Sesiones en Redis + cookie httpOnly — Fase 3a.
//
// La cookie guarda únicamente un id opaco (UUID v4). Todo el contenido de la
// sesión (usuarioId, rol, empresaId) vive en Redis bajo `session:<id>`, así que
// una sesión se puede revocar del lado servidor (logout, baja de usuario) sin
// esperar a que expire un token firmado.
//
// TTL deslizante: cada lectura válida renueva los 7 días.

import { cookies } from "next/headers";
import { redis } from "./redis";
import type { Rol } from "../../generated/enums";

export const SESSION_COOKIE = "avanza_session";

/** 7 días en segundos. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionData = {
  usuarioId: string;
  rol: Rol;
  empresaId: string | null;
};

function sessionKey(id: string): string {
  return `session:${id}`;
}

export async function createSession(data: SessionData): Promise<string> {
  const id = crypto.randomUUID();

  await redis.set(sessionKey(id), JSON.stringify(data), "EX", SESSION_TTL_SECONDS);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return id;
}

/**
 * Lee la sesión de la cookie actual y refresca su TTL. Devuelve null si no hay
 * cookie, si la sesión expiró en Redis, o si Redis no está disponible.
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const id = cookieStore.get(SESSION_COOKIE)?.value;
  if (!id) return null;

  try {
    const raw = await redis.get(sessionKey(id));
    if (!raw) return null;

    // TTL deslizante: la sesión sigue viva mientras el usuario la use.
    await redis.expire(sessionKey(id), SESSION_TTL_SECONDS);

    return JSON.parse(raw) as SessionData;
  } catch (error) {
    console.error("[session] lectura fallida:", error);
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const id = cookieStore.get(SESSION_COOKIE)?.value;

  if (id) {
    try {
      await redis.del(sessionKey(id));
    } catch (error) {
      console.error("[session] borrado en Redis fallido:", error);
    }
  }

  cookieStore.delete(SESSION_COOKIE);
}
