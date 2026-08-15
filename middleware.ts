// Protección de rutas — Fase 3a.
//
// DECISIÓN DE RUNTIME (por qué el middleware NO lee Redis)
// ---------------------------------------------------------------------------
// El middleware corre en Edge, donde `ioredis` no funciona (usa `net`/`tls` de
// Node). Se probaron las dos alternativas para leer Redis acá y ninguna sirve
// en Next.js 15.5.23 con webpack:
//
//   1. Sin `runtime: "nodejs"`  -> el middleware se registra, pero el build
//      falla: `node:diagnostics_channel` no existe en el bundle Edge.
//   2. Con `runtime: "nodejs"`  -> el build pasa, pero el middleware queda
//      AUSENTE del middleware-manifest.json, es decir silenciosamente
//      desactivado (verificado también con `experimental.nodeMiddleware`).
//      Habilitarlo de verdad exigiría migrar el build a Turbopack (beta),
//      un cambio desproporcionado para esta entrega.
//
// Por eso se usa el patrón que Next.js recomienda: el middleware hace un
// chequeo OPTIMISTA (¿existe la cookie de sesión?) para evitar renderizar
// páginas privadas a un anónimo, y la verificación real de sesión y rol ocurre
// en runtime Node.js, donde sí hay acceso a Redis:
//
//   - `app/admin/layout.tsx`  -> `requireRole()` real antes de renderizar el panel.
//   - `app/api/admin/*`       -> `requireRole()` real en cada route handler.
//
// La cookie es httpOnly y contiene un id opaco, así que falsificarla no da
// acceso a nada: sin entrada en Redis, las dos capas de arriba rechazan.

import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "avanza_session";

/**
 * Rutas del área privada del cliente.
 *
 * Desde la Entrega 2, `/evaluacion`, `/programa` y `/agenda` también exigen
 * sesión: el registro ya crea la sesión real, así que todo el flujo posterior
 * (evaluación -> programa -> agendar) trabaja contra `/api/cliente/*`.
 *
 * `/registro` queda fuera a propósito: es la única puerta de alta pública y
 * tiene que ser accesible sin sesión.
 */
export function middleware(request: NextRequest) {
  const tieneCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (tieneCookie) return NextResponse.next();

  const url = new URL("/login", request.url);
  url.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/home/:path*",
    "/proceso/:path*",
    "/mensajes/:path*",
    "/perfil/:path*",
    "/evaluacion/:path*",
    "/programa/:path*",
    "/agenda/:path*",
  ],
};
