// Autenticación y control de acceso por rol — Fase 3a.

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession, type SessionData } from "./session";
import type { Rol } from "../../generated/enums";

export type UsuarioAutenticado = {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  empresaId: string | null;
};

/**
 * Valida credenciales contra la tabla `usuarios`. Devuelve null tanto si el
 * correo no existe como si la contraseña no coincide — el llamador no debe
 * poder distinguir ambos casos (evita enumeración de usuarios).
 */
export async function login(correo: string, password: string): Promise<UsuarioAutenticado | null> {
  const usuario = await prisma.usuario.findUnique({
    where: { correo: correo.trim().toLowerCase() },
  });
  if (!usuario) return null;

  const passwordValida = await bcrypt.compare(password, usuario.passwordHash);
  if (!passwordValida) return null;

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    empresaId: usuario.empresaId,
  };
}

/** Error tipado que los route handlers traducen a una respuesta 401/403. */
export class AuthError extends Error {
  constructor(readonly status: 401 | 403, message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Exige una sesión activa con alguno de los roles indicados. Lanza `AuthError`
 * si no hay sesión (401) o si el rol no está autorizado (403).
 *
 * Esta es la frontera de seguridad real: el middleware solo hace un chequeo
 * previo de conveniencia, cada route handler vuelve a validar acá.
 */
export async function requireRole(...roles: Rol[]): Promise<SessionData> {
  const session = await getSession();
  if (!session) {
    throw new AuthError(401, "No hay sesión activa");
  }
  if (roles.length > 0 && !roles.includes(session.rol)) {
    throw new AuthError(403, "Rol no autorizado para este recurso");
  }
  return session;
}

/** Traduce un error de `requireRole` a Response; re-lanza cualquier otro error. */
export function authErrorResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
