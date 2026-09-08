// Capa de autenticación: credenciales, cookie de sesión y guards de autorización.
//
// Arquitectura (ADR 007): el middleware Edge sólo mira si la cookie existe.
// La validación real —¿la sesión sigue viva en Redis? ¿el rol alcanza?— pasa
// acá, en los layouts de servidor y en cada route handler.
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./prisma";
import { crearSesion, destruirSesion, getSession, type Sesion } from "./session";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, RUTA_LOGIN } from "./auth-constants";
import { ApiError } from "./http";
import type { Rol } from "../generated/prisma/client";

/** Coste de bcrypt. 10 = el mismo que usa `prisma/seed.ts`. */
const BCRYPT_ROUNDS = 10;

/**
 * Hash descartable para igualar el tiempo de respuesta cuando el email no
 * existe. Sin esto, "usuario inexistente" responde en ~0ms y "password
 * incorrecta" en ~80ms, lo que permite enumerar cuentas cronometrando.
 */
const HASH_SENUELO = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8s8dFMhQOKmMPd2Jq3ZmpXwLKmJ0mS";

export type UsuarioSesion = {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  /** Id de la fila Cliente si el usuario es CLIENTE; null para el resto. */
  clienteId: string | null;
};

export function hashearPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verifica email + password. Devuelve el usuario o null. Nunca distingue entre
 * "no existe", "inactivo" y "password incorrecta" hacia afuera: quien llama
 * debe responder siempre el mismo error genérico.
 */
export async function verificarCredenciales(
  email: string,
  password: string,
): Promise<UsuarioSesion | null> {
  const usuario = await db.usuario.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      passwordHash: true,
      activo: true,
      cliente: { select: { id: true } },
    },
  });

  const coincide = await bcrypt.compare(password, usuario?.passwordHash ?? HASH_SENUELO);
  if (!usuario || !usuario.activo || !coincide) return null;

  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    clienteId: usuario.cliente?.id ?? null,
  };
}

/**
 * Crea la sesión en Redis y setea la cookie. Sólo se puede llamar desde route
 * handlers o server actions (son los únicos contextos donde Next permite
 * escribir cookies).
 */
export async function abrirSesion(usuario: UsuarioSesion): Promise<string> {
  const { sessionId } = await crearSesion(usuario.id, usuario.rol);
  const store = await cookies();

  store.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    // Sólo por HTTPS en producción. En dev la app corre en http://localhost.
    secure: process.env.NODE_ENV === "production",
    // Lax y no Strict: con Strict, volver a la app desde un link externo (mail
    // de recuperación, notificación) llega sin cookie y muestra el login pese a
    // tener sesión válida. Lax ya bloquea POST cross-site, que es el vector CSRF.
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return sessionId;
}

/** Borra la sesión de Redis y la cookie del navegador. */
export async function cerrarSesion(): Promise<void> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;

  await destruirSesion(sessionId);
  store.delete(SESSION_COOKIE);
}

/** Sesión cruda desde Redis (userId + rol), sin tocar la base. */
export async function sesionActual(): Promise<Sesion | null> {
  const store = await cookies();
  return getSession(store.get(SESSION_COOKIE)?.value);
}

/**
 * Usuario autenticado, releído de la base en cada pedido. Se relee a propósito:
 * si al usuario le cambian el rol o lo desactivan, la sesión vieja en Redis
 * seguiría diciendo el rol anterior.
 */
export async function usuarioActual(): Promise<UsuarioSesion | null> {
  const sesion = await sesionActual();
  if (!sesion) return null;

  const usuario = await db.usuario.findUnique({
    where: { id: sesion.userId },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      activo: true,
      cliente: { select: { id: true } },
    },
  });

  if (!usuario || !usuario.activo) return null;

  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    clienteId: usuario.cliente?.id ?? null,
  };
}

// --- Guards para route handlers (lanzan ApiError, lo captura manejarError) ---

export async function requireSesion(): Promise<UsuarioSesion> {
  const usuario = await usuarioActual();
  if (!usuario) {
    throw new ApiError(401, "Sesión no válida o expirada", "no_autenticado");
  }
  return usuario;
}

export async function requireRole(...roles: Rol[]): Promise<UsuarioSesion> {
  const usuario = await requireSesion();
  if (roles.length > 0 && !roles.includes(usuario.rol)) {
    throw new ApiError(403, "No tenés permiso para esta operación", "sin_permiso");
  }
  return usuario;
}

// --- Guards para páginas y layouts (redirigen en vez de lanzar) ---

/**
 * Valida la sesión de verdad contra Redis dentro de un layout de servidor.
 * Es la segunda capa: el middleware Edge ya descartó a quien no tiene cookie,
 * pero no puede saber si la cookie sigue siendo válida (Edge no habla con Redis).
 */
export async function requireSesionPagina(...roles: Rol[]): Promise<UsuarioSesion> {
  const usuario = await usuarioActual();

  if (!usuario) {
    redirect(RUTA_LOGIN);
  }
  if (roles.length > 0 && !roles.includes(usuario.rol)) {
    // No se filtra la existencia del recurso: un CLIENTE que entra a /admin
    // vuelve a su home, no ve un 403 que confirme que /admin existe.
    redirect("/home");
  }

  return usuario;
}
