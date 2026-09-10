import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { jsonOk, manejarError } from "@/lib/http";
import { listarClientes } from "@/lib/admin-queries";
import { lineaValida } from "@/lib/validacion";
import { Rol } from "@/generated/prisma/client";

/**
 * Lista de clientes. Por defecto devuelve todos (el staff necesita ver la
 * operación completa). `?mios=1` es la bandeja 2, "mis clientes": filtra por el
 * coach autenticado. La bandeja global de evaluaciones es otro endpoint y no
 * usa este filtro — ADR 007.
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await requireRole(Rol.ADMINISTRADOR, Rol.COACH, Rol.SECRETARIA);
    const params = request.nextUrl.searchParams;

    const soloMios = params.get("mios") === "1";
    const lineaParam = params.get("linea");
    const busqueda = params.get("q")?.trim();

    const clientes = await listarClientes({
      coachId: soloMios ? usuario.id : undefined,
      linea: lineaParam ? lineaValida(lineaParam) : undefined,
      busqueda: busqueda || undefined,
    });

    return jsonOk({ clientes });
  } catch (error) {
    return manejarError(error);
  }
}
