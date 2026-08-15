// Defensa CSRF para endpoints que mutan estado — Fase 3a.
//
// La sesión viaja en una cookie `SameSite=Lax`, que ya bloquea la mayoría de los
// envíos cross-site. Pero Lax NO es suficiente por sí sola:
//
//   - Chrome aplica "Lax + POST": durante los primeros 2 minutos de vida de una
//     cookie, un POST cross-site de navegación de nivel superior SÍ la envía.
//   - `Request.json()` no valida `Content-Type`, así que un `<form>` cross-site
//     con `enctype="text/plain"` puede enviar un cuerpo JSON válido sin
//     disparar preflight CORS.
//
// El chequeo de `Origin` cierra ambos huecos: los navegadores siempre envían
// `Origin` en peticiones POST, y no es falsificable desde JavaScript de otro
// sitio. Se compara contra el host de la propia petición.

/** Host efectivo de la petición, respetando el reverse proxy si lo hay. */
function hostDeLaPeticion(request: Request): string | null {
  const headers = request.headers;
  return headers.get("x-forwarded-host") ?? headers.get("host");
}

/**
 * Devuelve una Response 403 si la petición no es del mismo origen, o `null` si
 * es legítima. Usar en TODO handler que muta estado (POST/PUT/PATCH/DELETE).
 */
export function csrfErrorResponse(request: Request): Response | null {
  const origin = request.headers.get("origin");

  // Sin `Origin` no se puede probar que la petición sea del mismo sitio. Los
  // navegadores lo envían siempre en POST, así que rechazar es seguro.
  if (!origin) {
    return Response.json({ error: "Origen de la petición ausente" }, { status: 403 });
  }

  const host = hostDeLaPeticion(request);
  if (!host) {
    return Response.json({ error: "Origen de la petición inválido" }, { status: 403 });
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return Response.json({ error: "Origen de la petición inválido" }, { status: 403 });
  }

  if (originHost !== host) {
    return Response.json({ error: "Origen de la petición no permitido" }, { status: 403 });
  }

  return null;
}
