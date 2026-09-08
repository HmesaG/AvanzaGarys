// Constantes compartidas entre el middleware Edge y el código Node.
// IMPORTANTE: este módulo NO debe importar nada (ni ioredis, ni Prisma, ni
// next/headers). El middleware corre en Edge Runtime y cualquier dependencia
// de Node lo rompe o lo deja fuera del runtime manifest — ver ADR 007.

/** Nombre de la cookie de sesión (httpOnly, no accesible desde JS del cliente). */
export const SESSION_COOKIE = "avanza_session";

/** TTL de la sesión en Redis y maxAge de la cookie: 7 días. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Prefijos de ruta protegidos por el middleware (capa optimista: sólo verifica
 * que exista la cookie). La validación real contra Redis vive en los layouts
 * y en `requireRole()` de los route handlers.
 */
export const RUTAS_PROTEGIDAS = [
  "/admin",
  "/evaluacion",
  "/programa",
  "/agenda",
  "/proceso",
  "/mensajes",
  "/perfil",
  "/home",
] as const;

/** Rutas públicas a las que se redirige o que nunca deben pedir sesión. */
export const RUTA_LOGIN = "/login";

export function esRutaProtegida(pathname: string): boolean {
  return RUTAS_PROTEGIDAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );
}
