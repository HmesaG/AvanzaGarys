import { requireSesion } from "@/lib/auth";
import { ApiError, jsonOk, manejarError } from "@/lib/http";
import { asegurarAccesoACliente } from "@/lib/autorizacion";
import { clienteDetalle } from "@/lib/admin-queries";
import { Rol } from "@/generated/prisma/client";

/**
 * Ficha de un cliente. Anti-IDOR: no alcanza con estar autenticado. El id de la
 * URL no se toma como autorización — `asegurarAccesoACliente()` exige ser staff
 * o ser el dueño de esa ficha. Un CLIENTE puede leer la suya y nada más.
 *
 * Para un miembro externo (`Rol.COACH`), además:
 * 1. Solo puede acceder a clientes asignados a su cartera (o aún sin coach).
 * 2. Se sanitizan los montos de pago y comprobantes bancarios del centro.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const usuario = await requireSesion();
    const { id } = await params;

    asegurarAccesoACliente(usuario, id);

    const cliente = await clienteDetalle(id);
    if (!cliente) {
      throw new ApiError(404, "El cliente no existe", "no_encontrado");
    }

    if (usuario.rol === Rol.COACH) {
      if (cliente.coach && cliente.coach.id !== usuario.id) {
        throw new ApiError(403, "Este paciente está asignado a otro especialista", "sin_permiso");
      }

      const clienteSanitizado = {
        ...cliente,
        pagos: cliente.pagos.map((pago) => ({
          ...pago,
          monto: 0,
          comprobanteUrl: null,
        })),
      };

      return jsonOk({ cliente: clienteSanitizado, ocultarMontos: true });
    }

    return jsonOk({ cliente, ocultarMontos: false });
  } catch (error) {
    return manejarError(error);
  }
}
