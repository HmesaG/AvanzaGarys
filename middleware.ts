// Capa 1 de la protección de rutas: middleware en Edge Runtime.
//
// POR QUÉ SÓLO CHEQUEA LA PRESENCIA DE LA COOKIE (no leas esto como un bug):
// Next.js 15 con webpack no soporta `runtime: "nodejs"` en el middleware de
// forma confiable — el build pasa sin errores pero el middleware queda fuera del
// runtime manifest y sus chequeos nunca corren (ADR 007, decisión 3). En Edge no
// hay acceso a ioredis ni a Prisma, así que acá no se puede validar la sesión
// contra Redis. La validación real vive en:
//   - los layouts de servidor (`app/admin/layout.tsx`, `app/(protegido)`...) vía
//     `requireSesionPagina()`
//   - cada route handler de la API vía `requireRole()`
// Este middleware es una barrera optimista y barata: descarta a quien ni siquiera
// tiene cookie, sin pagar un round-trip a Redis.
//
// Además setea las cabeceras de seguridad de toda la app. Se eligió el middleware
// en lugar de `headers()` en next.config.mjs para no tocar ese archivo (tiene un
// cambio en curso de otra sesión) y para poder variar la CSP entre dev y prod.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, RUTA_LOGIN, esRutaProtegida } from "./lib/auth-constants";

const esDesarrollo = process.env.NODE_ENV !== "production";

function politicaCSP(): string {
  const directivas = [
    "default-src 'self'",
    // 'unsafe-inline': Next inyecta el payload RSC en <script> inline. Sacarlo
    // exige CSP con nonce por pedido; queda como mejora pendiente (ver reporte).
    // 'unsafe-eval' sólo en dev: lo necesita el hot reload de React.
    `script-src 'self' 'unsafe-inline'${esDesarrollo ? " 'unsafe-eval'" : ""}`,
    // SweetAlert2 y Next inyectan estilos inline.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${esDesarrollo ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (!esDesarrollo) {
    directivas.push("upgrade-insecure-requests");
  }

  return directivas.join("; ");
}

function conCabecerasDeSeguridad(respuesta: NextResponse): NextResponse {
  respuesta.headers.set("Content-Security-Policy", politicaCSP());
  respuesta.headers.set("X-Content-Type-Options", "nosniff");
  respuesta.headers.set("X-Frame-Options", "DENY");
  respuesta.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  respuesta.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );

  if (!esDesarrollo) {
    // HSTS sólo en producción: en dev la app corre por http y el navegador
    // recordaría el pin, dejando localhost inaccesible por http.
    respuesta.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return respuesta;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (esRutaProtegida(pathname) && !request.cookies.get(SESSION_COOKIE)?.value) {
    const destino = request.nextUrl.clone();
    destino.pathname = RUTA_LOGIN;
    destino.search = "";
    destino.searchParams.set("next", `${pathname}${search}`);
    return conCabecerasDeSeguridad(NextResponse.redirect(destino));
  }

  return conCabecerasDeSeguridad(NextResponse.next());
}

export const config = {
  // Corre en todo salvo assets estáticos. Se excluye /api a propósito: las rutas
  // de API se protegen con requireRole() y deben responder 401 JSON, no un 307
  // al login.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.svg|favicon.ico|manifest.json|icons/).*)",
  ],
};
