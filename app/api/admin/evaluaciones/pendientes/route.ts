import { requireRole } from "@/lib/auth";
import { jsonOk, manejarError } from "@/lib/http";
import { evaluacionesPendientes } from "@/lib/admin-queries";
import { Rol } from "@/generated/prisma/client";

/**
 * Bandeja GLOBAL de evaluaciones sin revisar. No recibe ni acepta un filtro por
 * coach: ver el comentario de `evaluacionesPendientes()` y ADR 007.
 */
export async function GET() {
  try {
    await requireRole(Rol.ADMINISTRADOR, Rol.COACH);
    return jsonOk({ evaluaciones: await evaluacionesPendientes() });
  } catch (error) {
    return manejarError(error);
  }
}
