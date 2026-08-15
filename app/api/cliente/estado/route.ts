import { requireRole } from "@/lib/server/auth";
import { clienteErrorResponse, obtenerEstado } from "@/lib/server/cliente-queries";
import { Rol } from "../../../../generated/enums";

export const runtime = "nodejs";

/**
 * Estado agregado del cliente en sesión (evaluación + programa + consentimiento
 * + pago + próxima cita). Lo consumen `home`, `programa`, `agenda`, `proceso` y
 * `perfil`: un solo round-trip en vez de cinco endpoints chicos.
 *
 * Sin cache: el flujo del cliente es lectura-tras-escritura constante (envía la
 * evaluación y vuelve a leer, paga y vuelve a leer), donde un TTL corto solo
 * mostraría estado viejo.
 */
export async function GET() {
  try {
    const session = await requireRole(Rol.CLIENTE);
    return Response.json({ estado: await obtenerEstado(session) });
  } catch (error) {
    return clienteErrorResponse(error);
  }
}
