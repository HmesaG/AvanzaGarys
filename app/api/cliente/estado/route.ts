import { requireRole } from "@/lib/auth";
import { jsonOk, manejarError } from "@/lib/http";
import { obtenerEstado } from "@/lib/cliente-queries";
import { Rol } from "@/generated/prisma/client";

/**
 * Resumen agregado del cliente: evaluación + programa + pago + próxima cita +
 * tareas + diagnóstico. Evita que cada página (home/perfil/proceso/programa/
 * agenda) haga su propio round-trip — mismo criterio que ADR-008.
 */
export async function GET() {
  try {
    const usuario = await requireRole(Rol.CLIENTE);
    if (!usuario.clienteId) {
      throw new Error("Usuario CLIENTE sin fila Cliente asociada");
    }
    return jsonOk({ estado: await obtenerEstado(usuario.clienteId) });
  } catch (error) {
    return manejarError(error);
  }
}
