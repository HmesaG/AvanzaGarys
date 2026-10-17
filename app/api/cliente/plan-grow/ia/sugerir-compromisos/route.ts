import { requireRole } from "@/lib/auth";
import { jsonOk, manejarError } from "@/lib/http";
import { obtenerSugerenciasCompromisosIa } from "@/lib/grow-queries";
import { Rol } from "@/generated/prisma/client";

export async function GET() {
  try {
    const usuario = await requireRole(Rol.CLIENTE);
    const sugerencias = await obtenerSugerenciasCompromisosIa(usuario.clienteId!);
    return jsonOk({ sugerencias });
  } catch (error) {
    return manejarError(error);
  }
}
