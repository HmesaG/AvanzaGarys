import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server/auth";
import { csrfErrorResponse } from "@/lib/server/csrf";
import { CACHE_KEYS, invalidateCache } from "@/lib/server/cache";
import {
  ClienteError,
  clienteErrorResponse,
  clienteIdDeSesion,
} from "@/lib/server/cliente-queries";
import { Rol } from "../../../../../generated/enums";

export const runtime = "nodejs";

/**
 * Cancela una cita propia (el botón "X" de `/agenda`, que en el mock era
 * `clearSesion`). `EstadoCita` no tiene un valor CANCELADA, así que cancelar es
 * borrar la fila — cambiar el enum tocaría el schema y el panel admin.
 *
 * El borrado filtra por `clienteId` de la sesión además del id de la cita: un
 * `deleteMany` con las dos condiciones no puede borrar la cita de otro cliente
 * ni siquiera adivinando su id.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const csrfError = csrfErrorResponse(request);
    if (csrfError) return csrfError;

    const session = await requireRole(Rol.CLIENTE);
    const clienteId = await clienteIdDeSesion(session);
    const { id } = await params;

    const { count } = await prisma.cita.deleteMany({ where: { id, clienteId } });
    if (count === 0) {
      throw new ClienteError(404, "Cita no encontrada");
    }

    await Promise.all([
      invalidateCache(CACHE_KEYS.citasPattern),
      invalidateCache(CACHE_KEYS.dashboardPattern),
    ]);

    return Response.json({ ok: true });
  } catch (error) {
    return clienteErrorResponse(error);
  }
}
