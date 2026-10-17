import { requireRole } from "@/lib/auth";
import { jsonOk, manejarError } from "@/lib/http";
import { obtenerAlertasSistema } from "@/lib/admin-alertas";
import { Rol } from "@/generated/prisma/client";

export async function GET() {
  try {
    const usuario = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
    // Si es COACH, filtramos las alertas pertinentes a su cartera donde aplique
    const coachId = usuario.rol === Rol.COACH ? usuario.id : undefined;
    const alertas = await obtenerAlertasSistema(coachId);
    return jsonOk({ alertas });
  } catch (error) {
    return manejarError(error);
  }
}
