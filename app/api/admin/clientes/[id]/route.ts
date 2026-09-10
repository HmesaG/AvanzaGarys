import { requireSesion } from "@/lib/auth";
import { ApiError, jsonOk, manejarError } from "@/lib/http";
import { asegurarAccesoACliente } from "@/lib/autorizacion";
import { clienteDetalle } from "@/lib/admin-queries";

/**
 * Ficha de un cliente. Anti-IDOR: no alcanza con estar autenticado. El id de la
 * URL no se toma como autorización — `asegurarAccesoACliente()` exige ser staff
 * o ser el dueño de esa ficha. Un CLIENTE puede leer la suya y nada más.
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

    return jsonOk({ cliente });
  } catch (error) {
    return manejarError(error);
  }
}
