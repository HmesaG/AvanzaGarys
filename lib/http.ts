// Helpers compartidos por los route handlers: errores tipados, respuestas JSON,
// extracción de IP y verificación CSRF por origen.
import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly codigo: string = "error",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function jsonError(status: number, mensaje: string, codigo = "error"): NextResponse {
  return NextResponse.json({ error: mensaje, codigo }, { status });
}

/**
 * Convierte cualquier excepción en respuesta. Los `ApiError` exponen su mensaje;
 * cualquier otra cosa se loguea y se devuelve genérica, para no filtrar detalles
 * internos (stack, SQL, nombres de tabla) al cliente.
 */
export function manejarError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return jsonError(error.status, error.message, error.codigo);
  }
  console.error("[api] error no manejado:", error);
  return jsonError(500, "Error interno del servidor", "error_interno");
}

/**
 * IP del cliente. Detrás de un proxy (Docker, Vercel) la IP real viene en
 * `x-forwarded-for`; se toma el primer salto. Si no hay ninguna cabecera se usa
 * "desconocida", que agrupa a todos esos pedidos en el mismo bucket de rate
 * limit — conservador a propósito.
 */
export function ipDeRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const primera = forwarded.split(",")[0]?.trim();
    if (primera) return primera;
  }
  return request.headers.get("x-real-ip")?.trim() || "desconocida";
}

function hostDeUrl(valor: string): string | null {
  try {
    return new URL(valor).host;
  } catch {
    return null;
  }
}

/**
 * Protección CSRF por verificación de origen (patrón OWASP "Verifying Origin
 * With Standard Headers"), elegida en lugar de un token sincronizado porque:
 *
 *  - La cookie de sesión ya es SameSite=Lax, lo que bloquea el grueso de los
 *    CSRF cross-site; esto es la segunda barrera.
 *  - No requiere estado extra en Redis ni que el frontend arrastre un token en
 *    cada formulario (el frontend todavía está en mock; agregar un token ahora
 *    sería trabajo que el próximo agente tendría que cablear en cada vista).
 *
 * Si faltan `Origin` y `Referer` se rechaza: los navegadores mandan al menos uno
 * en pedidos con efectos secundarios. Un cliente no-navegador (curl, Postman)
 * debe mandar `Origin` explícito.
 */
export function verificarOrigen(request: Request): void {
  const metodo = request.method.toUpperCase();
  if (metodo === "GET" || metodo === "HEAD" || metodo === "OPTIONS") return;

  const hostEsperado =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!hostEsperado) {
    throw new ApiError(403, "No se pudo determinar el host del pedido", "csrf");
  }

  const permitidos = new Set<string>([hostEsperado]);
  for (const extra of (process.env.ALLOWED_ORIGINS ?? "").split(",")) {
    const host = hostDeUrl(extra.trim());
    if (host) permitidos.add(host);
  }

  const origen = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const hostDeclarado = origen ? hostDeUrl(origen) : referer ? hostDeUrl(referer) : null;

  if (!hostDeclarado) {
    throw new ApiError(403, "Falta la cabecera Origin o Referer", "csrf");
  }
  if (!permitidos.has(hostDeclarado)) {
    throw new ApiError(403, "Origen no permitido", "csrf");
  }
}

/** Lee el body como JSON. Falla con 400 en vez de romper con SyntaxError. */
export async function leerJson(request: Request): Promise<Record<string, unknown>> {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    throw new ApiError(400, "El cuerpo del pedido debe ser JSON válido", "json_invalido");
  }
  if (typeof cuerpo !== "object" || cuerpo === null || Array.isArray(cuerpo)) {
    throw new ApiError(400, "El cuerpo del pedido debe ser un objeto JSON", "json_invalido");
  }
  return cuerpo as Record<string, unknown>;
}
